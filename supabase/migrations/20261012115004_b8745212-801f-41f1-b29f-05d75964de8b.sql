CREATE OR REPLACE FUNCTION public.accept_codex_web()
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v timestamptz := now();
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  UPDATE public.profiles SET codex_accepted_at = COALESCE(codex_accepted_at, v) WHERE user_id = auth.uid() RETURNING codex_accepted_at INTO v;
  RETURN v;
END $$;
REVOKE ALL ON FUNCTION public.accept_codex_web() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_codex_web() TO authenticated;
-- DOWN: DROP FUNCTION public.accept_codex_web();