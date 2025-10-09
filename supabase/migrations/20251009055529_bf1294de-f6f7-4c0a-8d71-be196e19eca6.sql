-- Create admin_set_approval RPC to toggle participant approval securely
create or replace function public.admin_set_approval(
  p_user_id uuid,
  p_approved boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows_updated integer := 0;
begin
  -- Only admins can approve/unapprove participants
  if not public.is_admin(auth.uid()) then
    raise exception 'Only admins can approve/unapprove participants';
  end if;

  -- Update approval fields
  update public.profiles
  set 
    approved = p_approved,
    approved_at = case when p_approved then now() else null end,
    approved_by = case when p_approved then auth.uid() else null end,
    updated_at = now()
  where user_id = p_user_id;

  get diagnostics v_rows_updated = row_count;
  if v_rows_updated = 0 then
    raise exception 'Profile for user % not found', p_user_id;
  end if;

  -- Recalculate leaderboard/ranks for visibility changes
  perform public.update_user_leaderboard(p_user_id);
  perform public.recalculate_all_ranks();

  -- Audit
  insert into public.audit_log(action, table_name, record_id, user_id)
  values ('ADMIN_ACTION', 'profiles', p_user_id, auth.uid());
end;
$$;

-- Revoke from public and rely on RLS inside function; admins only via check
revoke all on function public.admin_set_approval(uuid, boolean) from public;
