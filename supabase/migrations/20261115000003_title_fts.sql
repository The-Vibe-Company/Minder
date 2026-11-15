-- Text-only search for now: add an optional item title, FTS over title + description.
-- embedding column stays (nullable) for a later semantic/image search; match_items kept but unused.
alter table public.items add column if not exists title text check (title is null or char_length(title) <= 120);

drop index if exists public.items_fts_idx;
alter table public.items drop column if exists fts;
alter table public.items add column fts tsvector generated always as (
  setweight(to_tsvector('french', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('french', coalesce(description, '')), 'B')
) stored;
create index items_fts_idx on public.items using gin(fts);

drop function if exists public.search_items_text(uuid, text, int);
create function public.search_items_text(p_list_id uuid, p_query text, p_limit int default 30)
returns table (id uuid, list_id uuid, photo_path text, title text, description text, rank real)
language sql stable security invoker set search_path = '' as $$
  select i.id, i.list_id, i.photo_path, i.title, i.description,
         ts_rank(i.fts, websearch_to_tsquery('french', p_query)) as rank
  from public.items i
  where i.list_id = p_list_id
    and (i.fts @@ websearch_to_tsquery('french', p_query)
         or i.description ilike '%' || p_query || '%'
         or i.title ilike '%' || p_query || '%')
  order by rank desc, i.created_at desc
  limit greatest(1, least(p_limit, 100));
$$;
grant execute on function public.search_items_text(uuid, text, int) to authenticated;
revoke execute on function public.search_items_text(uuid, text, int) from anon, public;
