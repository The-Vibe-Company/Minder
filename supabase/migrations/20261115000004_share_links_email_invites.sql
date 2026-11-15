begin;
alter table public.invites alter column expires_at drop not null,
  alter column expires_at set default null;
with ranked as (
 select id, row_number() over (partition by list_id order by created_at desc, id desc) as n
 from public.invites where revoked_at is null
)
update public.invites set revoked_at = now() where id in (select id from ranked where n > 1);
create unique index if not exists invites_one_active_per_list on public.invites(list_id) where revoked_at is null;

create or replace function public.invite_preview(p_token text)
returns table (list_id uuid, list_title text, owner_name text, expired boolean)
language sql stable security definer set search_path = '' as $$
 select l.id, l.title, p.display_name,
 (i.revoked_at is not null or (i.expires_at is not null and i.expires_at <= now()))
 from public.invites i join public.lists l on l.id = i.list_id
 left join public.profiles p on p.id = l.owner_id where i.token = p_token;
$$;
create or replace function public.accept_invite(p_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_list uuid;
begin
 if auth.uid() is null then raise exception 'not authenticated'; end if;
 select i.list_id into v_list from public.invites i where i.token = p_token
 and i.revoked_at is null and (i.expires_at is null or i.expires_at > now()) for share;
 if v_list is null then raise exception 'invite invalid or expired'; end if;
 insert into public.list_members(list_id,user_id,role) values(v_list,auth.uid(),'guest')
 on conflict do nothing;
 return v_list;
end $$;
-- Invoker retains owner RLS. Lock the list to serialize concurrent rotations.
create or replace function public.rotate_share_link(p_list_id uuid)
returns public.invites language plpgsql security invoker set search_path = '' as $$
declare result public.invites;
begin
 if not public.is_list_owner(p_list_id) then raise exception 'owner required'; end if;
 perform 1 from public.lists where id = p_list_id for update;
 update public.invites set revoked_at = now() where list_id = p_list_id and revoked_at is null;
 insert into public.invites(list_id,expires_at) values(p_list_id,null) returning * into result;
 return result;
end $$;
revoke all on function public.rotate_share_link(uuid) from public, anon;
grant execute on function public.rotate_share_link(uuid) to authenticated;

create table if not exists public.list_email_invites (
 id uuid primary key default gen_random_uuid(),
 list_id uuid not null references public.lists(id) on delete cascade,
 email text not null check(email = lower(email) and char_length(email) between 3 and 254 and position('@' in email) > 0),
 invited_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 accepted_at timestamptz,
 accepted_by uuid references auth.users(id) on delete set null,
 unique(list_id,email)
);
alter table public.list_email_invites enable row level security;
create index if not exists list_email_invites_email_idx on public.list_email_invites(email);
drop policy if exists email_invites_select on public.list_email_invites;
create policy email_invites_select on public.list_email_invites for select to authenticated using(public.is_list_owner(list_id));
drop policy if exists email_invites_insert on public.list_email_invites;
create policy email_invites_insert on public.list_email_invites for insert to authenticated
 with check(public.is_list_owner(list_id) and invited_by = auth.uid() and accepted_at is null and accepted_by is null);
drop policy if exists email_invites_delete on public.list_email_invites;
create policy email_invites_delete on public.list_email_invites for delete to authenticated using(public.is_list_owner(list_id));
grant select, insert, delete on public.list_email_invites to authenticated;

create or replace function public.claim_email_invites()
returns int language plpgsql security definer set search_path = '' as $$
declare v_email text; v_count int;
begin
 select lower(u.email) into v_email from auth.users u where u.id = auth.uid() and u.email_confirmed_at is not null;
 with claimed as (
 update public.list_email_invites set accepted_at = now(), accepted_by = auth.uid()
 where email = v_email and accepted_at is null returning list_id
 ), inserted as (
 insert into public.list_members(list_id,user_id,role)
 select list_id,auth.uid(),'guest' from claimed on conflict do nothing returning 1
 ) select count(*) into v_count from inserted;
 return v_count;
end $$;
revoke all on function public.claim_email_invites() from public, anon;
grant execute on function public.claim_email_invites() to authenticated;

create or replace function public.email_invite_inserted()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_user uuid;
begin
 select u.id into v_user from auth.users u where lower(u.email) = new.email and u.email_confirmed_at is not null;
 if v_user is not null then
 insert into public.list_members(list_id,user_id,role) values(new.list_id,v_user,'guest') on conflict do nothing;
 update public.list_email_invites set accepted_at = now(), accepted_by = v_user where id = new.id;
 end if;
 return new;
end $$;
create or replace function public.email_user_confirmed()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if new.email_confirmed_at is not null then
 with claimed as (
 update public.list_email_invites set accepted_at = now(), accepted_by = new.id
 where email = lower(new.email) and accepted_at is null returning list_id
 )
 insert into public.list_members(list_id,user_id,role)
 select list_id,new.id,'guest' from claimed on conflict do nothing;
 end if;
 return new;
end $$;
revoke all on function public.email_invite_inserted() from public, anon, authenticated;
revoke all on function public.email_user_confirmed() from public, anon, authenticated;
drop trigger if exists email_invite_inserted on public.list_email_invites;
create trigger email_invite_inserted after insert on public.list_email_invites for each row execute function public.email_invite_inserted();
drop trigger if exists email_user_confirmed on auth.users;
create trigger email_user_confirmed after insert or update of email_confirmed_at,email on auth.users for each row execute function public.email_user_confirmed();
commit;
