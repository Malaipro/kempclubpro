CREATE TABLE public.participant_reset_backups (
 operation_key text PRIMARY KEY,
 payload jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.participant_reset_backups TO service_role;
REVOKE ALL ON public.participant_reset_backups FROM PUBLIC, anon, authenticated;
ALTER TABLE public.participant_reset_backups ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.participant_reset_backups IS 'Service-only recovery snapshots for approved one-off participant resets; no client policies.';

DO $reset$
DECLARE
 ids uuid[] := ARRAY['8f2a4afa-afb4-4c45-9c26-e19e443caf13','00fa3ae5-e4ff-4fe7-909a-06481aa300fa','fb2d633b-8bc8-4e8f-8ad4-855edeb869ba']::uuid[];
 stream uuid := 'c4fcd7b8-0826-4ac3-96b0-faf8d1c00808';
 tables text[] := ARRAY['activity_checkins','homework_submissions','ascetic_activities','journal_entries','journal_answers','journal_emotions','participant_checkpoints','participant_weekly_summaries','schedule_participants'];
 expected jsonb := '{"activity_checkins":28,"homework_submissions":5,"ascetic_activities":1,"journal_entries":32,"journal_answers":60,"journal_emotions":319,"participant_checkpoints":1,"participant_weekly_summaries":4,"schedule_participants":1}';
 snapshot jsonb; rows_json jsonb; preserved_before jsonb; preserved_after jsonb;
 others_before jsonb; others_after jsonb; all_before jsonb; all_after jsonb;
 tbl text; predicate text; dry boolean; count_rows integer; deleted integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('reset-stream-8-20261104'));
 IF EXISTS (SELECT 1 FROM public.participant_reset_backups WHERE operation_key='reset-stream-8-20261104') THEN RAISE EXCEPTION 'Reset already recorded'; END IF;
 PERFORM 1 FROM public.profiles WHERE user_id=ANY(ids) FOR UPDATE;
 IF (SELECT count(*) FROM public.profiles WHERE user_id=ANY(ids) AND current_stream_id=stream AND participant_status='intensive_active') <> 3 THEN RAISE EXCEPTION 'Approved participant scope changed'; END IF;
 -- Lock only the involved application tables against concurrent writes during both passes.
 FOREACH tbl IN ARRAY tables LOOP EXECUTE format('LOCK TABLE public.%I IN SHARE ROW EXCLUSIVE MODE',tbl); END LOOP;
 LOCK TABLE public.profiles,public.leaderboard,public.public_profiles,public.coin_transactions IN SHARE ROW EXCLUSIVE MODE;
 -- Preserve coin rows and every profile field except the two explicitly reset rating fields.
 SELECT jsonb_build_object('coins',COALESCE((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.id) FROM public.coin_transactions c WHERE c.user_id=ANY(ids)),'[]'::jsonb),'profiles',COALESCE((SELECT jsonb_agg(to_jsonb(p)-'total_points'-'rank_position'-'updated_at' ORDER BY p.user_id) FROM public.profiles p WHERE p.user_id=ANY(ids)),'[]'::jsonb)) INTO preserved_before;
 SELECT jsonb_build_object('profiles',COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.user_id) FROM public.profiles p WHERE NOT(p.user_id=ANY(ids))),'[]'::jsonb),'leaderboard',COALESCE((SELECT jsonb_agg(to_jsonb(l) ORDER BY l.user_id) FROM public.leaderboard l WHERE NOT(l.user_id=ANY(ids))),'[]'::jsonb),'public_profiles',COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.user_id) FROM public.public_profiles p WHERE NOT(p.user_id=ANY(ids))),'[]'::jsonb)) INTO others_before;
 all_before := '{}'::jsonb;
 FOREACH tbl IN ARRAY ARRAY['streams','schedules','homework_assignments','contracts','contract_data','mastermind_members','mastermind_entries','mastermind_tasks','mastermind_track_goals','user_points','user_achievements','user_totems','participant_habits','habit_progress','cooper_test_results','user_challenges','challenge_entries','training_sessions','lectures','crash_tests','hero_races','tactical_sessions','user_activities','weekly_summaries'] LOOP
  EXECUTE format('SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.id),''[]''::jsonb) FROM public.%I t',tbl) INTO rows_json;
  all_before := all_before || jsonb_build_object(tbl,rows_json);
 END LOOP;
 FOREACH dry IN ARRAY ARRAY[true,false] LOOP
  BEGIN
   snapshot := '{}'::jsonb; deleted:=0;
   FOREACH tbl IN ARRAY tables LOOP
    predicate := CASE WHEN tbl IN ('journal_answers','journal_emotions') THEN 't.entry_id IN (SELECT id FROM public.journal_entries WHERE user_id=ANY($1))' ELSE 't.user_id=ANY($1)' END;
    EXECUTE format('SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.id),''[]''::jsonb) FROM public.%I t WHERE %s',tbl,predicate) INTO rows_json USING ids;
    count_rows := jsonb_array_length(rows_json);
    IF count_rows <> (expected->>tbl)::integer THEN RAISE EXCEPTION 'Preflight count changed for %: %',tbl,count_rows; END IF;
    snapshot := snapshot || jsonb_build_object(tbl,rows_json);
    deleted := deleted + count_rows;
   END LOOP;
   IF deleted <> 451 THEN RAISE EXCEPTION 'Expected exactly 451 selected rows'; END IF;
   SELECT COALESCE(jsonb_agg(jsonb_build_object('user_id',p.user_id,'total_points',p.total_points,'rank_position',p.rank_position) ORDER BY p.user_id),'[]'::jsonb) INTO rows_json FROM public.profiles p WHERE p.user_id=ANY(ids);
   snapshot := snapshot || jsonb_build_object('profiles',rows_json);
   SELECT COALESCE(jsonb_agg(to_jsonb(l) ORDER BY l.user_id),'[]'::jsonb) INTO rows_json FROM public.leaderboard l WHERE l.user_id=ANY(ids);
   snapshot := snapshot || jsonb_build_object('leaderboard',rows_json);
   SELECT COALESCE(jsonb_agg(jsonb_build_object('user_id',p.user_id,'total_points',p.total_points,'rank_position',p.rank_position) ORDER BY p.user_id),'[]'::jsonb) INTO rows_json FROM public.public_profiles p WHERE p.user_id=ANY(ids);
   snapshot := snapshot || jsonb_build_object('public_profiles',rows_json);
   INSERT INTO public.participant_reset_backups(operation_key,payload) VALUES ('reset-stream-8-20261104',snapshot);
   -- Children first, with explicit selected user/entry predicates; shared parents remain intact.
   DELETE FROM public.journal_answers WHERE entry_id IN (SELECT id FROM public.journal_entries WHERE user_id=ANY(ids));
   DELETE FROM public.journal_emotions WHERE entry_id IN (SELECT id FROM public.journal_entries WHERE user_id=ANY(ids));
   DELETE FROM public.journal_entries WHERE user_id=ANY(ids);
   DELETE FROM public.activity_checkins WHERE user_id=ANY(ids);
   DELETE FROM public.homework_submissions WHERE user_id=ANY(ids);
   DELETE FROM public.ascetic_activities WHERE user_id=ANY(ids);
   DELETE FROM public.participant_checkpoints WHERE user_id=ANY(ids);
   DELETE FROM public.participant_weekly_summaries WHERE user_id=ANY(ids);
   DELETE FROM public.schedule_participants WHERE user_id=ANY(ids);
   UPDATE public.leaderboard SET total_points=0,bjj_points=0,kickboxing_points=0,ofp_points=0,theory_points=0,challenges_points=0,tactical_points=0,monthly_points=0,kamp_pyramid_points=0,nutrition_points=0,rank_position=0,last_updated=now() WHERE user_id=ANY(ids);
   UPDATE public.profiles SET total_points=0,rank_position=0 WHERE user_id=ANY(ids);
   UPDATE public.public_profiles SET total_points=0,rank_position=0,updated_at=now() WHERE user_id=ANY(ids);
   IF EXISTS(SELECT 1 FROM public.profiles WHERE user_id=ANY(ids) AND (total_points IS DISTINCT FROM 0 OR rank_position IS DISTINCT FROM 0 OR current_stream_id IS DISTINCT FROM stream)) THEN RAISE EXCEPTION 'Profile reset failed'; END IF;
   IF EXISTS(SELECT 1 FROM public.leaderboard WHERE user_id=ANY(ids) AND (total_points IS DISTINCT FROM 0 OR rank_position IS DISTINCT FROM 0)) THEN RAISE EXCEPTION 'Leaderboard reset failed'; END IF;
   IF EXISTS(SELECT 1 FROM public.profiles WHERE user_id=ANY(ids) AND public.calculate_participant_rating(user_id,stream) <> 0) THEN RAISE EXCEPTION 'Live calculated rating is not zero'; END IF;
   FOREACH tbl IN ARRAY tables LOOP
    predicate := CASE WHEN tbl IN ('journal_answers','journal_emotions') THEN 't.entry_id IN (SELECT (value->>''id'')::uuid FROM jsonb_array_elements($2->''journal_entries''))' ELSE 't.user_id=ANY($1)' END;
    EXECUTE format('SELECT count(*) FROM public.%I t WHERE %s',tbl,predicate) INTO count_rows USING ids,snapshot;
    IF count_rows<>0 THEN RAISE EXCEPTION 'Residual reset records in %',tbl; END IF;
   END LOOP;
   SELECT jsonb_build_object('coins',COALESCE((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.id) FROM public.coin_transactions c WHERE c.user_id=ANY(ids)),'[]'::jsonb),'profiles',COALESCE((SELECT jsonb_agg(to_jsonb(p)-'total_points'-'rank_position'-'updated_at' ORDER BY p.user_id) FROM public.profiles p WHERE p.user_id=ANY(ids)),'[]'::jsonb)) INTO preserved_after;
   IF preserved_before IS DISTINCT FROM preserved_after THEN RAISE EXCEPTION 'Coins or protected profile fields changed'; END IF;
   SELECT jsonb_build_object('profiles',COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.user_id) FROM public.profiles p WHERE NOT(p.user_id=ANY(ids))),'[]'::jsonb),'leaderboard',COALESCE((SELECT jsonb_agg(to_jsonb(l) ORDER BY l.user_id) FROM public.leaderboard l WHERE NOT(l.user_id=ANY(ids))),'[]'::jsonb),'public_profiles',COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.user_id) FROM public.public_profiles p WHERE NOT(p.user_id=ANY(ids))),'[]'::jsonb)) INTO others_after;
   IF others_before IS DISTINCT FROM others_after THEN RAISE EXCEPTION 'Unselected participants changed'; END IF;
   all_after := '{}'::jsonb;
   FOREACH tbl IN ARRAY ARRAY['streams','schedules','homework_assignments','contracts','contract_data','mastermind_members','mastermind_entries','mastermind_tasks','mastermind_track_goals','user_points','user_achievements','user_totems','participant_habits','habit_progress','cooper_test_results','user_challenges','challenge_entries','training_sessions','lectures','crash_tests','hero_races','tactical_sessions','user_activities','weekly_summaries'] LOOP
    EXECUTE format('SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.id),''[]''::jsonb) FROM public.%I t',tbl) INTO rows_json;
    all_after := all_after || jsonb_build_object(tbl,rows_json);
   END LOOP;
   IF all_before IS DISTINCT FROM all_after THEN RAISE EXCEPTION 'Unrelated data changed'; END IF;
   IF dry THEN RAISE EXCEPTION USING ERRCODE='ZX001',MESSAGE='Dry run passed; rolling back rehearsal'; END IF;
  EXCEPTION WHEN SQLSTATE 'ZX001' THEN
   IF NOT dry THEN RAISE; END IF;
   RAISE NOTICE 'Dry run passed: 451 records, three zero ratings, coins and unrelated data preserved';
  END;
 END LOOP;
END;
$reset$;