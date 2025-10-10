-- Grant EXECUTE on admin_set_approval to authenticated users
-- The function itself checks is_admin internally, so it's safe
grant execute on function public.admin_set_approval(uuid, boolean) to authenticated;