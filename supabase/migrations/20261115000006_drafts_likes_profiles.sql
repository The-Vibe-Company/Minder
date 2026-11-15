-- Existing visible items remain published; new inserts are always drafts.
alter table public.items add column if not exists status text not null default 'draft' check (status in ('draft','published'));
alter table public.items add column if not exists published_at timestamptz;
-- Backfill once only; migration reruns must not publish newly-created drafts.
do $$ begin
 if not exists (select 1 from pg_catalog.pg_trigger where tgname='items_guard') then
   update public.items set status='published', published_at=created_at;
 end if;
end $$;
alter table public.profiles add column if not exists onboarded_at timestamptz;

create or replace function public.guard_item()
returns trigger language plpgsql set search_path = '' as $$
begin
 if TG_OP = 'INSERT' then
   new.status := 'draft'; new.published_at := null;
 else
   if new.list_id is distinct from old.list_id or new.created_by is distinct from old.created_by or new.photo_path is distinct from old.photo_path then
     raise exception 'immutable item fields';
   end if;
   if new.status = 'published' and old.status = 'draft' then new.published_at := now();
   else new.published_at := old.published_at; end if;
 end if;
 return new;
end $$;
drop trigger if exists items_guard on public.items;
create trigger items_guard before insert or update on public.items for each row execute function public.guard_item();
revoke all on function public.guard_item() from public, anon, authenticated;

drop policy if exists items_select on public.items;
create policy items_select on public.items for select to authenticated using (
 public.is_list_member(list_id) and (status='published' or created_by=auth.uid() or public.is_list_owner(list_id)));
drop policy if exists items_update on public.items;
create policy items_update on public.items for update to authenticated
 using (public.is_list_owner(list_id) or (created_by=auth.uid() and public.is_list_member(list_id)))
 with check (public.is_list_owner(list_id) or (created_by=auth.uid() and public.is_list_member(list_id)));

-- Trigger executes under definer to verify the item even when RLS hides it.
create or replace function public.votes_check_list()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if not exists (select 1 from public.items i where i.id=new.item_id and i.list_id=new.list_id and i.status='published') then
   raise exception 'vote requires published item in matching list';
 end if;
 return new;
end $$;

drop policy if exists item_photos_select on storage.objects;
create policy item_photos_select on storage.objects for select to authenticated using (
 bucket_id='item-photos' and (
 public.is_list_owner(((storage.foldername(name))[1])::uuid)
 or exists (select 1 from public.items i where i.photo_path=name
 and public.is_list_member(i.list_id) and (i.status='published' or i.created_by=auth.uid()))));

create or replace function public.items_to_swipe(p_list_id uuid, p_limit int default 20)
returns setof public.items language sql stable security invoker set search_path = '' as $$
  select i.* from public.items i
  where i.status = 'published' and i.list_id = p_list_id
    and not exists (select 1 from public.votes v where v.item_id = i.id and v.user_id = auth.uid())
  order by i.created_at asc
  limit greatest(1, least(p_limit, 100));
$$;
create or replace function public.search_items_text(p_list_id uuid, p_query text, p_limit int default 30)
returns table (id uuid, list_id uuid, photo_path text, title text, description text, rank real)
language sql stable security invoker set search_path = '' as $$
  select i.id, i.list_id, i.photo_path, i.title, i.description,
         ts_rank(i.fts, websearch_to_tsquery('french', p_query)) as rank
  from public.items i
  where i.status = 'published' and i.list_id = p_list_id
    and (i.fts @@ websearch_to_tsquery('french', p_query)
         or i.description ilike '%' || p_query || '%'
         or i.title ilike '%' || p_query || '%')
  order by rank desc, i.created_at desc
  limit greatest(1, least(p_limit, 100));
$$;
create or replace function public.match_items(p_list_id uuid, p_query_embedding extensions.vector(768), p_limit int default 30)
returns table (id uuid, list_id uuid, photo_path text, description text, similarity double precision)
language sql stable security invoker set search_path = '' as $$
  select i.id, i.list_id, i.photo_path, i.description,
         1 - (i.embedding operator(extensions.<=>) p_query_embedding) as similarity
  from public.items i
  where i.status = 'published' and i.list_id = p_list_id and i.embedding is not null
  order by i.embedding operator(extensions.<=>) p_query_embedding
  limit greatest(1, least(p_limit, 100));
$$;
