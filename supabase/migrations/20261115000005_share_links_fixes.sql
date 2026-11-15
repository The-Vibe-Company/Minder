begin;
update public.invites set expires_at = null where revoked_at is null;

create or replace function public.rotate_share_link(p_list_id uuid)
returns public.invites language plpgsql security invoker set search_path = '' as $$
declare result public.invites;
begin
 if not public.is_list_owner(p_list_id) then raise exception 'owner required'; end if;
 perform 1 from public.lists where id = p_list_id for no key update;
 update public.invites set revoked_at = now() where list_id = p_list_id and revoked_at is null;
 insert into public.invites(list_id,expires_at) values(p_list_id,null) returning * into result;
 return result;
end $$;
revoke all on function public.rotate_share_link(uuid) from public, anon;
grant execute on function public.rotate_share_link(uuid) to authenticated;
commit;
