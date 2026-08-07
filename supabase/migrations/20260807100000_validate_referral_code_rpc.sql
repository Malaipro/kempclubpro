-- RPC для проверки реферального кода на публичной странице /join.
-- Прямой SELECT из profiles с anon-ключом заблокирован политикой
-- "Explicitly deny public access to profiles" (USING (false)),
-- поэтому валидация кода нуждается в SECURITY DEFINER функции,
-- которая не раскрывает ничего, кроме user_id владельца кода.

CREATE OR REPLACE FUNCTION public.validate_referral_code(p_code text)
RETURNS TABLE(user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id
  FROM public.profiles p
  WHERE p.referral_code = p_code
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.validate_referral_code(text) TO anon, authenticated;
