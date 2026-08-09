-- 08_rls_policies.sql (v3) — включение RLS на 80 таблицах и 194 политики.
-- Отличия от v2: политики переведены с TO public на TO authenticated везде,
-- кроме явно публичных SELECT лендинга и INSERT формы заявки (см. RLS_REVIEW.md).
-- Политики Мастермайнда с предикатом true заменены на проверку членства/админа.

ALTER TABLE public.achievement_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ascetic_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ascetic_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_rate_limit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cooper_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crash_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hero_races ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intensive_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_emotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastermind_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastermind_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastermind_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastermind_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pyramid_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tactical_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_bot_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_bot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.totems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_totems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."аскезы_участников" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."кэмп_активности" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."тотемы_участников" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."участники" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access for achievement_types" ON public.achievement_types AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "Achievements are publicly readable" ON public.achievements AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "Activities are publicly viewable" ON public.activities AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "Admins can manage activities" ON public.activities AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]))))));

CREATE POLICY "Users can insert their own checkins" ON public.activity_checkins AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view their own checkins" ON public.activity_checkins AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "Super admins can view all sessions" ON public.admin_sessions AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Users can view their own sessions" ON public.admin_sessions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "Admins can add application notes" ON public.application_notes AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((is_admin(auth.uid()) AND (author_id = auth.uid())));

CREATE POLICY "Admins can view application notes" ON public.application_notes AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Authors or super admins can delete application notes" ON public.application_notes AS PERMISSIVE FOR DELETE TO authenticated
  USING ((is_admin(auth.uid()) AND ((author_id = auth.uid()) OR is_super_admin(auth.uid()))));

CREATE POLICY "Admins can create application reminders" ON public.application_reminders AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((is_admin(auth.uid()) AND (author_id = auth.uid())));

CREATE POLICY "Admins can delete application reminders" ON public.application_reminders AS PERMISSIVE FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update application reminders" ON public.application_reminders AS PERMISSIVE FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can view application reminders" ON public.application_reminders AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can create ascetic activities for any participant" ON public.ascetic_activities AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]))))));

CREATE POLICY "Admins can update ascetic activities" ON public.ascetic_activities AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role, 'trainer'::user_role]))))));

CREATE POLICY "Trainers can view all ascetic activities" ON public.ascetic_activities AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role, 'trainer'::user_role]))))));

CREATE POLICY "Users can insert their own ascetic activities" ON public.ascetic_activities AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view their own ascetic activities" ON public.ascetic_activities AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "Ascetic types are publicly readable" ON public.ascetic_types AS PERMISSIVE FOR SELECT TO public
  USING ((is_active = true));

CREATE POLICY "Super admins can manage ascetic types" ON public.ascetic_types AS PERMISSIVE FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Secure audit log insertions" ON public.audit_log AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((((current_setting('request.jwt.claims'::text, true))::json ->> 'role'::text) = 'service_role'::text) OR ((auth.uid() IS NOT NULL) AND (current_setting('role'::text, true) = 'authenticated'::text))));

CREATE POLICY "Super admins can view audit logs" ON public.audit_log AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Admins can create broadcasts" ON public.broadcast_messages AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete broadcasts" ON public.broadcast_messages AS PERMISSIVE FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update broadcasts" ON public.broadcast_messages AS PERMISSIVE FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can view broadcasts" ON public.broadcast_messages AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins manage broadcast_responses" ON public.broadcast_responses AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins manage broadcasts" ON public.broadcasts AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "challenge_entries_delete_own" ON public.challenge_entries AS PERMISSIVE FOR DELETE TO authenticated
  USING (((user_id = auth.uid()) OR is_super_admin(auth.uid())));

CREATE POLICY "challenge_entries_insert_own" ON public.challenge_entries AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "challenge_entries_select_own" ON public.challenge_entries AS PERMISSIVE FOR SELECT TO authenticated
  USING (((user_id = auth.uid()) OR is_admin(auth.uid()) OR is_super_admin(auth.uid())));

CREATE POLICY "Admins can delete challenges" ON public.challenges AS PERMISSIVE FOR DELETE TO authenticated
  USING ((is_admin(auth.uid()) OR is_super_admin(auth.uid())));

CREATE POLICY "Admins can insert challenges" ON public.challenges AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((is_admin(auth.uid()) OR is_super_admin(auth.uid())));

CREATE POLICY "Admins can update challenges" ON public.challenges AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((is_admin(auth.uid()) OR is_super_admin(auth.uid())))
  WITH CHECK ((is_admin(auth.uid()) OR is_super_admin(auth.uid())));

CREATE POLICY "Challenges are publicly readable" ON public.challenges AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "challenges_read" ON public.challenges AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "Admins manage coin rules" ON public.coin_rules AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Authenticated can read active coin rules" ON public.coin_rules AS PERMISSIVE FOR SELECT TO authenticated
  USING (((is_active = true) OR is_admin(auth.uid())));

CREATE POLICY "Admins manage coin transactions" ON public.coin_transactions AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins view all coin transactions" ON public.coin_transactions AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Users view own coin transactions" ON public.coin_transactions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "coin_transactions: only admins DELETE" ON public.coin_transactions AS RESTRICTIVE FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "coin_transactions: only admins INSERT" ON public.coin_transactions AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "coin_transactions: only admins UPDATE" ON public.coin_transactions AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admin only read access to contact submissions" ON public.contact_submissions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]))))));

CREATE POLICY "Admins can delete contact submissions" ON public.contact_submissions AS PERMISSIVE FOR DELETE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]))))));

CREATE POLICY "Admins can update contact submissions" ON public.contact_submissions AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]))))))
  WITH CHECK ((((processed = true) AND (processed_by = auth.uid())) OR (processed = false)));

CREATE POLICY "Allow validated contact form submissions" ON public.contact_submissions AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((validate_contact_submission(name, phone, course, social) AND (length(name) <= 100) AND (length(phone) <= 20) AND (length(course) <= 100) AND ((social IS NULL) OR (length(social) <= 200))));

CREATE POLICY "Deny public read access to contact submissions" ON public.contact_submissions AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (false);

CREATE POLICY "Admins can manage content blocks" ON public.content_blocks AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Content blocks are publicly readable" ON public.content_blocks AS PERMISSIVE FOR SELECT TO public
  USING ((is_active = true));

CREATE POLICY "Admins can view all contract data" ON public.contract_data AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Users can insert own contract data" ON public.contract_data AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can update own contract data" ON public.contract_data AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can view own contract data" ON public.contract_data AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "Admins can view all contracts" ON public.contracts AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Service role can manage contracts" ON public.contracts AS PERMISSIVE FOR ALL TO authenticated
  USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));

CREATE POLICY "Users can view own contracts" ON public.contracts AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "Admins can create cooper test results for any participant" ON public.cooper_test_results AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role, 'trainer'::user_role]))))));

CREATE POLICY "Admins can delete cooper test results" ON public.cooper_test_results AS PERMISSIVE FOR DELETE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role, 'trainer'::user_role]))))));

CREATE POLICY "Admins can update cooper test results" ON public.cooper_test_results AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role, 'trainer'::user_role]))))));

CREATE POLICY "Public can view Cooper test results for club residents" ON public.cooper_test_results AS PERMISSIVE FOR SELECT TO public
  USING (((verified = true) AND (EXISTS ( SELECT 1
   FROM public_profiles
  WHERE ((public_profiles.user_id = cooper_test_results.user_id) AND (public_profiles.participant_status = 'club_resident'::participant_status_type))))));

CREATE POLICY "Public can view Cooper test results for intensive active partic" ON public.cooper_test_results AS PERMISSIVE FOR SELECT TO public
  USING (((verified = true) AND (EXISTS ( SELECT 1
   FROM public_profiles
  WHERE ((public_profiles.user_id = cooper_test_results.user_id) AND (public_profiles.participant_status = 'intensive_active'::participant_status_type))))));

CREATE POLICY "Public can view verified Cooper test results for visible partic" ON public.cooper_test_results AS PERMISSIVE FOR SELECT TO public
  USING (((verified = true) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.user_id = cooper_test_results.user_id) AND (profiles.approved = true) AND (COALESCE(profiles.leaderboard_visible, true) = true) AND (COALESCE(profiles.profile_private, false) = false))))));

CREATE POLICY "Trainers can view all cooper test results" ON public.cooper_test_results AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role, 'trainer'::user_role]))))));

CREATE POLICY "Users can insert their own cooper test results" ON public.cooper_test_results AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view their own cooper test results" ON public.cooper_test_results AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "Admins can manage all crash test data" ON public.crash_tests AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Public can view crash tests of approved participants" ON public.crash_tests AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (((verified = true) AND is_public_participant(user_id)));

CREATE POLICY "Users can insert own crash tests" ON public.crash_tests AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view own crash tests" ON public.crash_tests AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "Admins can view all habit progress" ON public.habit_progress AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role, 'trainer'::user_role]))))));

CREATE POLICY "Users can manage their own habit progress" ON public.habit_progress AS PERMISSIVE FOR ALL TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "Admins can manage all hero race data" ON public.hero_races AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Users can insert own hero races" ON public.hero_races AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view own hero races" ON public.hero_races AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "Admins manage all homework assignments" ON public.homework_assignments AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Intensive participants view their assignments" ON public.homework_assignments AS PERMISSIVE FOR SELECT TO authenticated
  USING (((is_active = true) AND ((target_user_id = auth.uid()) OR ((stream_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.current_stream_id = homework_assignments.stream_id) AND (p.participant_status = 'intensive_active'::participant_status_type))))))));

CREATE POLICY "Admins can manage all homework data" ON public.homework_submissions AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Users can insert own homework" ON public.homework_submissions AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view own homework" ON public.homework_submissions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "Allow public read access for active streams" ON public.intensive_streams AS PERMISSIVE FOR SELECT TO public
  USING ((is_active = true));

CREATE POLICY "Admins view all answers" ON public.journal_answers AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Users manage own answers" ON public.journal_answers AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM journal_entries e
  WHERE ((e.id = journal_answers.entry_id) AND (e.user_id = auth.uid())))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM journal_entries e
  WHERE ((e.id = journal_answers.entry_id) AND (e.user_id = auth.uid())))));

CREATE POLICY "Admins view all emotions" ON public.journal_emotions AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Users manage own emotions" ON public.journal_emotions AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM journal_entries e
  WHERE ((e.id = journal_emotions.entry_id) AND (e.user_id = auth.uid())))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM journal_entries e
  WHERE ((e.id = journal_emotions.entry_id) AND (e.user_id = auth.uid())))));

CREATE POLICY "Admins view all entries" ON public.journal_entries AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Users manage own entries" ON public.journal_entries AS PERMISSIVE FOR ALL TO authenticated
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Admins manage prompts" ON public.journal_prompts AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Prompts viewable by authenticated" ON public.journal_prompts AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage leaderboard" ON public.leaderboard AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Anon can view leaderboard via public_profiles" ON public.leaderboard AS PERMISSIVE FOR SELECT TO anon
  USING ((EXISTS ( SELECT 1
   FROM public_profiles
  WHERE (public_profiles.user_id = leaderboard.user_id))));

CREATE POLICY "Authenticated users can view public leaderboard entries" ON public.leaderboard AS PERMISSIVE FOR SELECT TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.user_id = leaderboard.user_id) AND (profiles.leaderboard_visible = true)))) OR (user_id = auth.uid())));

CREATE POLICY "Admins can manage all lecture data" ON public.lectures AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Users can insert own lectures" ON public.lectures AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view own lectures" ON public.lectures AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "mm_entries_admin_write" ON public.mastermind_entries AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "mm_entries_insert" ON public.mastermind_entries AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.mastermind_members m WHERE m.id = member_id AND m.user_id = auth.uid()));

CREATE POLICY "mm_entries_read" ON public.mastermind_entries AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.mastermind_members m WHERE m.id = member_id AND m.user_id = auth.uid()));

CREATE POLICY "mm_groups_read" ON public.mastermind_groups AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.mastermind_members m WHERE m.group_id = id AND m.user_id = auth.uid()));

CREATE POLICY "mm_members_read" ON public.mastermind_members AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR user_id = auth.uid());

CREATE POLICY "mm_tasks_read" ON public.mastermind_tasks AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.mastermind_members m WHERE m.id = member_id AND m.user_id = auth.uid()));

CREATE POLICY "mm_tasks_update" ON public.mastermind_tasks AS PERMISSIVE FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.mastermind_members m WHERE m.id = member_id AND m.user_id = auth.uid()))
  WITH CHECK (is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.mastermind_members m WHERE m.id = member_id AND m.user_id = auth.uid()));

CREATE POLICY "Admins manage all materials" ON public.materials AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Members view available materials" ON public.materials AS PERMISSIVE FOR SELECT TO authenticated
  USING (((is_active = true) AND (is_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND ((materials.available_to = 'all'::text) OR ((materials.available_to = 'intensive'::text) AND (p.participant_status = 'intensive_active'::participant_status_type)) OR ((materials.available_to = 'club'::text) AND (p.participant_status = 'club_resident'::participant_status_type))) AND ((materials.stream_id IS NULL) OR (materials.stream_id = p.current_stream_id))))))));

CREATE POLICY "Admins can manage moments" ON public.moments AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Moments are publicly readable" ON public.moments AS PERMISSIVE FOR SELECT TO public
  USING ((is_active = true));

CREATE POLICY "Users can update their own notifications" ON public.notifications AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can view their own notifications" ON public.notifications AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "Admins can manage all habits" ON public.participant_habits AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]))))));

CREATE POLICY "Admins can view all habits" ON public.participant_habits AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role, 'trainer'::user_role]))))));

CREATE POLICY "Users can insert their own habits" ON public.participant_habits AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can update their own habits" ON public.participant_habits AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can view their own habits" ON public.participant_habits AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "Admins manage participant_notes" ON public.participant_notes AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins manage participant_status_history" ON public.participant_status_history AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins manage participant_tags" ON public.participant_tags AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins manage profile_tags" ON public.profile_tags AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update any profile" ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can view all profiles" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Block anonymous access to profiles" ON public.profiles AS RESTRICTIVE FOR ALL TO anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Users can insert their own profile" ON public.profiles AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can update their own profile" ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can view their own profile" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "Public can read public profiles" ON public.public_profiles AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "Public testimonials are readable by everyone" ON public.public_testimonials AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "Admins manage pyramid levels" ON public.pyramid_levels AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Authenticated can view pyramid levels" ON public.pyramid_levels AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can delete leads" ON public.referral_leads AS PERMISSIVE FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update leads" ON public.referral_leads AS PERMISSIVE FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can view all leads" ON public.referral_leads AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Anyone can submit referral lead with valid code" ON public.referral_leads AS PERMISSIVE FOR INSERT TO anon, authenticated
  WITH CHECK (((bonus_awarded = false) AND (status = 'new'::text) AND ((length(TRIM(BOTH FROM name)) >= 2) AND (length(TRIM(BOTH FROM name)) <= 100)) AND ((phone IS NULL) OR ((length(phone) >= 5) AND (length(phone) <= 30))) AND ((telegram IS NULL) OR (length(telegram) <= 100)) AND ((comment IS NULL) OR (length(comment) <= 1000)) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = referral_leads.referrer_user_id) AND (p.referral_code = referral_leads.referral_code) AND (p.referral_code IS NOT NULL))))));

CREATE POLICY "Referrer can view own leads" ON public.referral_leads AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = referrer_user_id));

CREATE POLICY "Admins manage settings" ON public.referral_settings AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Settings readable by anon for join page" ON public.referral_settings AS PERMISSIVE FOR SELECT TO anon
  USING (true);

CREATE POLICY "Settings readable by authenticated" ON public.referral_settings AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins manage all reward requests" ON public.reward_requests AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users view own reward requests" ON public.reward_requests AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "Admins manage rewards" ON public.rewards AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Club residents view active rewards" ON public.rewards AS PERMISSIVE FOR SELECT TO authenticated
  USING (((is_active = true) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.participant_status = 'club_resident'::participant_status_type))))));

CREATE POLICY "Super admins can view role audit logs" ON public.role_audit_log AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Club residents can register for club schedules" ON public.schedule_participants AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((auth.uid() = user_id) AND (is_club_resident(auth.uid()) OR is_admin(auth.uid()))));

CREATE POLICY "Trainers can view all schedule participants" ON public.schedule_participants AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role, 'trainer'::user_role]))))));

CREATE POLICY "Users can view their own schedule participation" ON public.schedule_participants AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "admins_delete_any_participation" ON public.schedule_participants AS PERMISSIVE FOR DELETE TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role, 'trainer'::user_role]))))));

CREATE POLICY "users_delete_own_participation" ON public.schedule_participants AS PERMISSIVE FOR DELETE TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "Admins and trainers can manage schedules" ON public.schedules AS PERMISSIVE FOR ALL TO authenticated
  USING ((is_admin(auth.uid()) OR has_role(auth.uid(), 'trainer'::user_role)))
  WITH CHECK ((is_admin(auth.uid()) OR has_role(auth.uid(), 'trainer'::user_role)));

CREATE POLICY "Club schedules are viewable by club residents" ON public.schedules AS PERMISSIVE FOR SELECT TO authenticated
  USING (((schedule_type = 'club'::schedule_type) AND (is_active = true) AND (is_club_resident(auth.uid()) OR is_admin(auth.uid()))));

CREATE POLICY "Intensive schedules are publicly viewable" ON public.schedules AS PERMISSIVE FOR SELECT TO public
  USING (((schedule_type = 'intensive'::schedule_type) AND (is_active = true)));

CREATE POLICY "Admins can manage streams" ON public.streams AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]))))));

CREATE POLICY "Streams are publicly viewable" ON public.streams AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "Admins can manage all tactical data" ON public.tactical_sessions AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Users can insert own tactical sessions" ON public.tactical_sessions AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view own tactical sessions" ON public.tactical_sessions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "super_admin_select_bot_logs" ON public.telegram_bot_logs AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Admins can update telegram leads" ON public.telegram_leads AS PERMISSIVE FOR UPDATE TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can view telegram leads" ON public.telegram_leads AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage testimonials" ON public.testimonials AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can view all testimonial data" ON public.testimonials AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage totems" ON public.totems AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Totems are publicly readable" ON public.totems AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "Trainers are publicly readable" ON public.trainers AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "Training programs are publicly readable" ON public.training_programs AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "Admins can manage all training sessions" ON public.training_sessions AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can create their own training sessions" ON public.training_sessions AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can insert their own training sessions" ON public.training_sessions AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can update their own training sessions" ON public.training_sessions AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view their own training sessions" ON public.training_sessions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can view their own achievements" ON public.user_achievements AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "Admins manage user activities" ON public.user_activities AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Trainers can view all user activities" ON public.user_activities AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role, 'trainer'::user_role]))))));

CREATE POLICY "Users can insert their own activities" ON public.user_activities AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view their own activities" ON public.user_activities AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can join challenges" ON public.user_challenges AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view their own challenge participation" ON public.user_challenges AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "Admins can manage user points" ON public.user_points AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Users can view own points" ON public.user_points AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "Only super admins can assign roles" ON public.user_roles AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage user roles" ON public.user_roles AS PERMISSIVE FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Users can view their own roles" ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "Admins can assign totems" ON public.user_totems AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]))))));

CREATE POLICY "Admins can view all totems" ON public.user_totems AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role]))))));

CREATE POLICY "Public can view totems of approved participants" ON public.user_totems AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (is_public_participant(user_id));

CREATE POLICY "Users can view their own totems" ON public.user_totems AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "Admins manage weekly summaries" ON public.weekly_summaries AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can manage their own ascetics" ON public."аскезы_участников" AS PERMISSIVE FOR ALL TO authenticated
  USING ((participant_id IN ( SELECT "участники".id
   FROM "участники"
  WHERE ("участники".user_id = auth.uid()))));

CREATE POLICY "Users can view their own kamp activities" ON public."кэмп_активности" AS PERMISSIVE FOR SELECT TO authenticated
  USING ((participant_id IN ( SELECT "участники".id
   FROM "участники"
  WHERE ("участники".user_id = auth.uid()))));

CREATE POLICY "Users can view their own totems" ON public."тотемы_участников" AS PERMISSIVE FOR SELECT TO authenticated
  USING ((participant_id IN ( SELECT "участники".id
   FROM "участники"
  WHERE ("участники".user_id = auth.uid()))));

CREATE POLICY "Users can update their own participant" ON public."участники" AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can view their own participant" ON public."участники" AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));
