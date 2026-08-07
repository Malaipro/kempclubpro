
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mastermind_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mastermind_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mastermind_entries TO authenticated;
GRANT ALL ON public.mastermind_members TO service_role;
GRANT ALL ON public.mastermind_tasks TO service_role;
GRANT ALL ON public.mastermind_entries TO service_role;

CREATE POLICY "mm_members_admin_write" ON public.mastermind_members
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "mm_tasks_admin_write" ON public.mastermind_tasks
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "mm_entries_admin_write" ON public.mastermind_entries
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
