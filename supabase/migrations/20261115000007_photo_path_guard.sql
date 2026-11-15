begin;
set local search_path = '';

-- Bind every item reference to its own list, including existing rows.
-- Validate separately so inconsistent historical data fails loudly.
do $$ begin
 if not exists (select 1 from pg_catalog.pg_constraint
   where conrelid = 'public.items'::regclass and conname = 'items_photo_path_list_check') then
   alter table public.items add constraint items_photo_path_list_check
     check (pg_catalog.starts_with(photo_path, list_id::text || '/')) not valid;
 end if;
end $$;
alter table public.items validate constraint items_photo_path_list_check;

-- Compare folder IDs as text: arbitrary object names must never cause UUID casts.
drop policy if exists item_photos_select on storage.objects;
create policy item_photos_select on storage.objects for select to authenticated using (
 bucket_id = 'item-photos' and (
   exists (select 1 from public.lists l
     where l.id::text = (storage.foldername(name))[1] and l.owner_id = auth.uid())
   or exists (select 1 from public.items i
     where i.photo_path = name
       and i.list_id::text = (storage.foldername(name))[1]
       and public.is_list_member(i.list_id)
       and (i.status = 'published' or i.created_by = auth.uid()))
 ));

commit;
