-- 07_grants.sql (v4) — минимально необходимые привилегии PostgREST-ролей.
-- Отличие от v2: вместо «полный доступ всем ролям на все таблицы» —
-- матрица из TABLE_ACCESS_MATRIX.md. anon получает только то, что реально
-- нужно публичному лендингу и форме заявки; всё остальное — authenticated,
-- права всегда не шире, чем разрешает соответствующая RLS-политика (08).

-- v4: запрещаем клиентским ролям создавать объекты в схеме public
REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

GRANT SELECT ON public.achievement_types TO anon;
GRANT SELECT ON public.achievement_types TO authenticated;
GRANT SELECT ON public.achievements TO anon;
GRANT SELECT ON public.achievements TO authenticated;
GRANT SELECT ON public.activities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;
GRANT SELECT, INSERT ON public.activity_checkins TO authenticated;
-- admin_access_log: только service_role (служебная таблица, политик для клиентов нет)
GRANT SELECT ON public.admin_sessions TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.application_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_reminders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ascetic_activities TO authenticated;
GRANT SELECT ON public.ascetic_types TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ascetic_types TO authenticated;
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.broadcast_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.broadcast_responses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.broadcasts TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.challenge_entries TO authenticated;
GRANT SELECT ON public.challenges TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenges TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coin_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coin_transactions TO authenticated;
-- contact_rate_limit: только service_role (служебная таблица, политик для клиентов нет)
GRANT INSERT ON public.contact_submissions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_submissions TO authenticated;
GRANT SELECT ON public.content_blocks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_blocks TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.contract_data TO authenticated;
GRANT SELECT ON public.contracts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cooper_test_results TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crash_tests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habit_progress TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hero_races TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.homework_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.homework_submissions TO authenticated;
GRANT SELECT ON public.intensive_streams TO anon;
GRANT SELECT ON public.intensive_streams TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_answers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_emotions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_prompts TO authenticated;
GRANT SELECT ON public.leaderboard TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leaderboard TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lectures TO authenticated;
GRANT SELECT, INSERT ON public.mastermind_entries TO authenticated;
GRANT SELECT ON public.mastermind_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mastermind_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mastermind_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materials TO authenticated;
GRANT SELECT ON public.moments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.moments TO authenticated;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.participant_habits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.participant_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.participant_status_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.participant_tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_testimonials TO anon;
GRANT SELECT ON public.public_testimonials TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pyramid_levels TO authenticated;
GRANT INSERT ON public.referral_leads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.referral_leads TO authenticated;
GRANT SELECT ON public.referral_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.referral_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reward_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rewards TO authenticated;
GRANT SELECT ON public.role_audit_log TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.schedule_participants TO authenticated;
GRANT SELECT ON public.schedules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedules TO authenticated;
GRANT SELECT ON public.streams TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.streams TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tactical_sessions TO authenticated;
GRANT SELECT ON public.telegram_bot_logs TO authenticated;
-- telegram_bot_sessions: только service_role (служебная таблица, политик для клиентов нет)
GRANT SELECT, UPDATE ON public.telegram_leads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.testimonials TO authenticated;
GRANT SELECT ON public.totems TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.totems TO authenticated;
GRANT SELECT ON public.trainers TO anon;
GRANT SELECT ON public.trainers TO authenticated;
GRANT SELECT ON public.training_programs TO anon;
GRANT SELECT ON public.training_programs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_sessions TO authenticated;
GRANT SELECT ON public.user_achievements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_activities TO authenticated;
GRANT SELECT, INSERT ON public.user_challenges TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_points TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_totems TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_summaries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."аскезы_участников" TO authenticated;
GRANT SELECT ON public."кэмп_активности" TO authenticated;
GRANT SELECT ON public."тотемы_участников" TO authenticated;
GRANT SELECT, UPDATE ON public."участники" TO authenticated;

-- v4: публичные данные отдаются только через безопасные представления (06_views.sql).
-- Таблицы public_profiles и cooper_test_results роли anon больше не выдаются.
GRANT SELECT ON public.public_leaderboard_view TO anon, authenticated;
GRANT SELECT ON public.public_cooper_results_view TO anon, authenticated;

-- ---------------------------------------------------------------
-- EXECUTE: по умолчанию функции недоступны клиентским ролям.
-- ---------------------------------------------------------------
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- anon: только то, что вызывается на публичных страницах и в RLS-предикатах anon
GRANT EXECUTE ON FUNCTION public.validate_contact_submission(text, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_referral_code(text) TO anon;
-- v4: используется в anon-политиках crash_tests / user_totems / leaderboard
GRANT EXECUTE ON FUNCTION public.is_public_participant(uuid) TO anon;

-- authenticated: вспомогательные функции RLS + RPC, вызываемые из ЛК/админки
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_club_resident(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_public_participant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, user_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_referral_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_referral_code(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_coin_balance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_participant_full_state(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_participant_timeline(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_telegram_link_code(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlink_telegram_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_reward_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_security_event(text, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_leaderboard(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_coins(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_confirm_referral(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_approval(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_coin_balances() TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_referral_lead(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enroll_application(uuid, uuid, uuid, participant_status_type) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_homework_submission(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_reward_request(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_participant_status(uuid, participant_status_type) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_coins_by_rule(uuid, text, text, uuid, text, integer) TO authenticated;

-- v4: НЕ выдаются клиентским ролям (только service_role):
--   decrypt_phone(text)      — расшифровка телефона любого участника по строке;
--                              см. SECURITY_NOTES.md и правку src/hooks/usePhoneDecryption.ts
--   mask_email_secure / mask_phone_secure / mask_phone_number / mask_participant_name
--                            — во фронтенде не вызываются, маскирование делается на сервере
--   encrypt_phone(text)      — только серверная сторона
--
-- Остальные функции (RPC Telegram Mini App по p_telegram_id, server_*, cron,
-- триггерные и служебные) вызываются только с service_role — см. FUNCTION_ACCESS_MATRIX.md.
