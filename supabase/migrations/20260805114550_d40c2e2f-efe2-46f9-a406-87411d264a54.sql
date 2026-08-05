GRANT SELECT ON public.challenges TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenges TO authenticated;
GRANT ALL ON public.challenges TO service_role;

CREATE POLICY "Admins can insert challenges"
ON public.challenges FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Admins can update challenges"
ON public.challenges FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Admins can delete challenges"
ON public.challenges FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()));