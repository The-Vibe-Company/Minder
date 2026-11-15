-- Restrict SECURITY DEFINER helpers: trigger functions are never callable via the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_new_list() from public, anon, authenticated;
revoke execute on function public.votes_check_list() from public, anon, authenticated;
revoke execute on function public.is_list_member(uuid) from public, anon;
revoke execute on function public.is_list_owner(uuid) from public, anon;
grant execute on function public.is_list_member(uuid) to authenticated;
grant execute on function public.is_list_owner(uuid) to authenticated;
