DO $reset$
DECLARE
 uid uuid := '9b972710-84a4-4e95-894d-2eee1ce8360b';
 stream uuid := 'c4fcd7b8-0826-4ac3-96b0-faf8d1c00808';
 tables text[] := ARRAY['activity_checkins','homework_submissions','ascetic_activities','journal_entries','journal_answers','journal_emotions','participant_checkpoints','participant_weekly_summaries','schedule_participants'];
 snapshot jsonb := '{}'::jsonb; rows_json jsonb; tbl text; predicate text; coins_before jsonb; coins_after jsonb;
BEGIN
 IF EXISTS (SELECT 1 FROM public.participant_reset_backups WHERE operation_key='reset-stream-8-dmitriy116-20261116') THEN RAISE EXCEPTION 'Reset already recorded'; END IF;
 SELECT COALESCE(jsonb_agg(to_jsonb(c) ORDER BY c.id),'[]') INTO coins_before FROM public.coin_transactions c WHERE c.user_id=uid;
 FOREACH tbl IN ARRAY tables LOOP
  predicate := CASE WHEN tbl IN ('journal_answers','journal_emotions') THEN 't.entry_id IN (SELECT id FROM public.journal_entries WHERE user_id=$1)' ELSE 't.user_id=$1' END;
  EXECUTE format('SELECT COALESCE(jsonb_agg(to_jsonb(t)),''[]''::jsonb) FROM public.%I t WHERE %s',tbl,predicate) INTO rows_json USING uid;
  snapshot := snapshot || jsonb_build_object(tbl,rows_json);
 END LOOP;
 snapshot := snapshot
  || jsonb_build_object('profiles',(SELECT jsonb_agg(jsonb_build_object('user_id',user_id,'total_points',total_points,'rank_position',rank_position,'current_stream_id',current_stream_id,'participant_status',participant_status)) FROM public.profiles WHERE user_id=uid))
  || jsonb_build_object('leaderboard',COALESCE((SELECT jsonb_agg(to_jsonb(l)) FROM public.leaderboard l WHERE user_id=uid),'[]'))
  || jsonb_build_object('public_profiles',COALESCE((SELECT jsonb_agg(jsonb_build_object('user_id',user_id,'total_points',total_points,'rank_position',rank_position)) FROM public.public_profiles WHERE user_id=uid),'[]'))
  || jsonb_build_object('targeted_assignments',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'is_active',is_active)) FROM public.homework_assignments WHERE target_user_id=uid),'[]'));
 INSERT INTO public.participant_reset_backups(operation_key,payload) VALUES ('reset-stream-8-dmitriy116-20261116',snapshot);
 DELETE FROM public.journal_answers WHERE entry_id IN (SELECT id FROM public.journal_entries WHERE user_id=uid);
 DELETE FROM public.journal_emotions WHERE entry_id IN (SELECT id FROM public.journal_entries WHERE user_id=uid);
 DELETE FROM public.journal_entries WHERE user_id=uid;
 DELETE FROM public.activity_checkins WHERE user_id=uid;
 DELETE FROM public.homework_submissions WHERE user_id=uid;
 DELETE FROM public.ascetic_activities WHERE user_id=uid;
 DELETE FROM public.participant_checkpoints WHERE user_id=uid;
 DELETE FROM public.participant_weekly_summaries WHERE user_id=uid;
 DELETE FROM public.schedule_participants WHERE user_id=uid;
 UPDATE public.homework_assignments SET is_active=false WHERE target_user_id=uid;
 UPDATE public.leaderboard SET total_points=0,bjj_points=0,kickboxing_points=0,ofp_points=0,theory_points=0,challenges_points=0,tactical_points=0,monthly_points=0,kamp_pyramid_points=0,nutrition_points=0,rank_position=0,last_updated=now() WHERE user_id=uid;
 UPDATE public.profiles SET total_points=0,rank_position=0,current_stream_id=stream,participant_status='intensive_active' WHERE user_id=uid;
 UPDATE public.public_profiles SET total_points=0,rank_position=0,updated_at=now() WHERE user_id=uid;
 SELECT COALESCE(jsonb_agg(to_jsonb(c) ORDER BY c.id),'[]') INTO coins_after FROM public.coin_transactions c WHERE c.user_id=uid;
 IF coins_before IS DISTINCT FROM coins_after THEN RAISE EXCEPTION 'Coins changed'; END IF;
END;
$reset$;