-- Minder initial schema: profiles, lists, members, invites, items (pgvector + FTS), votes, RLS, storage.
create extension if not exists vector with schema extensions;

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- LISTS
create table public.lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  created_at timestamptz not null default now()
);
create index lists_owner_idx on public.lists(owner_id);

create table public.list_members (
  list_id uuid not null references public.lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','guest')),
  created_at timestamptz not null default now(),
  primary key (list_id, user_id)
);
create index list_members_user_idx on public.list_members(user_id);

create or replace function public.handle_new_list()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.list_members (list_id, user_id, role) values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end $$;
create trigger on_list_created after insert on public.lists
  for each row execute function public.handle_new_list();

create or replace function public.is_list_member(p_list_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.list_members m where m.list_id = p_list_id and m.user_id = auth.uid());
$$;
create or replace function public.is_list_owner(p_list_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.lists l where l.id = p_list_id and l.owner_id = auth.uid());
$$;

-- INVITES
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  token text not null unique default (replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','')),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '14 days'),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index invites_list_idx on public.invites(list_id);

-- ITEMS
create table public.items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  photo_path text not null,
  description text,
  description_auto text,
  embedding extensions.vector(768),
  embedding_model text,
  fts tsvector generated always as (to_tsvector('french', coalesce(description, ''))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index items_list_idx on public.items(list_id, created_at desc);
create index items_fts_idx on public.items using gin(fts);
create index items_embedding_idx on public.items using hnsw (embedding extensions.vector_cosine_ops);

-- VOTES
create table public.votes (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  list_id uuid not null references public.lists(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  choice text not null check (choice in ('yes','no')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, user_id)
);
create index votes_list_idx on public.votes(list_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
create trigger items_touch before update on public.items for each row execute function public.touch_updated_at();
create trigger votes_touch before update on public.votes for each row execute function public.touch_updated_at();

-- vote list_id must match item list_id
create or replace function public.votes_check_list()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.items i where i.id = new.item_id and i.list_id = new.list_id) then
    raise exception 'vote list mismatch';
  end if;
  return new;
end $$;
create trigger votes_check_list before insert or update on public.votes for each row execute function public.votes_check_list();

-- RLS
alter table public.profiles enable row level security;
alter table public.lists enable row level security;
alter table public.list_members enable row level security;
alter table public.invites enable row level security;
alter table public.items enable row level security;
alter table public.votes enable row level security;

create policy profiles_select on public.profiles for select to authenticated using (
  id = auth.uid() or exists (
    select 1 from public.list_members a join public.list_members b on a.list_id = b.list_id
    where a.user_id = auth.uid() and b.user_id = profiles.id));
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy lists_select on public.lists for select to authenticated using (public.is_list_member(id) or owner_id = auth.uid());
create policy lists_insert on public.lists for insert to authenticated with check (owner_id = auth.uid());
create policy lists_update on public.lists for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy lists_delete on public.lists for delete to authenticated using (owner_id = auth.uid());

create policy members_select on public.list_members for select to authenticated using (public.is_list_member(list_id));
create policy members_delete on public.list_members for delete to authenticated using (
  (public.is_list_owner(list_id) and role = 'guest') or (user_id = auth.uid() and role = 'guest'));

create policy invites_select on public.invites for select to authenticated using (public.is_list_owner(list_id));
create policy invites_insert on public.invites for insert to authenticated with check (public.is_list_owner(list_id) and created_by = auth.uid());
create policy invites_update on public.invites for update to authenticated using (public.is_list_owner(list_id)) with check (public.is_list_owner(list_id));
create policy invites_delete on public.invites for delete to authenticated using (public.is_list_owner(list_id));

create policy items_select on public.items for select to authenticated using (public.is_list_member(list_id));
create policy items_insert on public.items for insert to authenticated with check (public.is_list_owner(list_id) and created_by = auth.uid());
create policy items_update on public.items for update to authenticated using (public.is_list_owner(list_id)) with check (public.is_list_owner(list_id));
create policy items_delete on public.items for delete to authenticated using (public.is_list_owner(list_id));

create policy votes_select on public.votes for select to authenticated using (user_id = auth.uid() or public.is_list_owner(list_id));
create policy votes_insert on public.votes for insert to authenticated with check (user_id = auth.uid() and public.is_list_member(list_id));
create policy votes_update on public.votes for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_list_member(list_id));
create policy votes_delete on public.votes for delete to authenticated using (user_id = auth.uid());

-- RPCs
create or replace function public.invite_preview(p_token text)
returns table (list_id uuid, list_title text, owner_name text, expired boolean)
language sql stable security definer set search_path = '' as $$
  select l.id, l.title, p.display_name, (i.revoked_at is not null or i.expires_at < now())
  from public.invites i join public.lists l on l.id = i.list_id
  left join public.profiles p on p.id = l.owner_id
  where i.token = p_token;
$$;

create or replace function public.accept_invite(p_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_list uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select i.list_id into v_list from public.invites i
   where i.token = p_token and i.revoked_at is null and i.expires_at > now();
  if v_list is null then raise exception 'invite invalid or expired'; end if;
  insert into public.list_members (list_id, user_id, role) values (v_list, auth.uid(), 'guest')
  on conflict (list_id, user_id) do nothing;
  return v_list;
end $$;

create or replace function public.items_to_swipe(p_list_id uuid, p_limit int default 20)
returns setof public.items language sql stable security invoker set search_path = '' as $$
  select i.* from public.items i
  where i.list_id = p_list_id
    and not exists (select 1 from public.votes v where v.item_id = i.id and v.user_id = auth.uid())
  order by i.created_at asc
  limit greatest(1, least(p_limit, 100));
$$;

create or replace function public.search_items_text(p_list_id uuid, p_query text, p_limit int default 30)
returns table (id uuid, list_id uuid, photo_path text, description text, rank real)
language sql stable security invoker set search_path = '' as $$
  select i.id, i.list_id, i.photo_path, i.description,
         ts_rank(i.fts, websearch_to_tsquery('french', p_query)) as rank
  from public.items i
  where i.list_id = p_list_id
    and (i.fts @@ websearch_to_tsquery('french', p_query) or i.description ilike '%' || p_query || '%')
  order by rank desc, i.created_at desc
  limit greatest(1, least(p_limit, 100));
$$;

create or replace function public.match_items(p_list_id uuid, p_query_embedding extensions.vector(768), p_limit int default 30)
returns table (id uuid, list_id uuid, photo_path text, description text, similarity double precision)
language sql stable security invoker set search_path = '' as $$
  select i.id, i.list_id, i.photo_path, i.description,
         1 - (i.embedding operator(extensions.<=>) p_query_embedding) as similarity
  from public.items i
  where i.list_id = p_list_id and i.embedding is not null
  order by i.embedding operator(extensions.<=>) p_query_embedding
  limit greatest(1, least(p_limit, 100));
$$;

revoke execute on function public.accept_invite(text) from anon, public;
grant execute on function public.accept_invite(text) to authenticated;
revoke execute on function public.invite_preview(text) from public;
grant execute on function public.invite_preview(text) to anon, authenticated;

-- STORAGE: private bucket, path = {list_id}/{file}
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-photos', 'item-photos', false, 10485760, array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do nothing;

create policy item_photos_select on storage.objects for select to authenticated using (
  bucket_id = 'item-photos' and public.is_list_member(((storage.foldername(name))[1])::uuid));
create policy item_photos_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'item-photos' and public.is_list_owner(((storage.foldername(name))[1])::uuid));
create policy item_photos_update on storage.objects for update to authenticated using (
  bucket_id = 'item-photos' and public.is_list_owner(((storage.foldername(name))[1])::uuid));
create policy item_photos_delete on storage.objects for delete to authenticated using (
  bucket_id = 'item-photos' and public.is_list_owner(((storage.foldername(name))[1])::uuid));
