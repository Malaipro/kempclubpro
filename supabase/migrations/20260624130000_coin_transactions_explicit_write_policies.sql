-- Explicit write restrictions for coin_transactions.
--
-- Previously, INSERT/UPDATE/DELETE by non-admins was implicitly denied
-- because no permissive policy matched. This is correct but invisible —
-- a future developer adding a direct client-side write would see 0 rows
-- affected or a silent error with no clear explanation.
--
-- These RESTRICTIVE policies make the intent explicit:
--   "Only admins may write coin_transactions directly."
--   "All other writes MUST go through SECURITY DEFINER RPCs:
--    award_coins_by_rule, admin_adjust_coins, confirm_referral_lead,
--    create_reward_request, review_reward_request, link_telegram_lead_to_profile"
--
-- RESTRICTIVE semantics: an operation succeeds only when ALL restrictive
-- policies pass AND at least one permissive policy passes.
-- SECURITY DEFINER functions run as the function owner and bypass RLS
-- entirely — they are unaffected by these policies.

CREATE POLICY "coin_transactions: only admins INSERT"
  ON public.coin_transactions
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "coin_transactions: only admins UPDATE"
  ON public.coin_transactions
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "coin_transactions: only admins DELETE"
  ON public.coin_transactions
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));
