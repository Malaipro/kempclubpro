-- REVIEW ONLY: do not run automatically. Submit through a NEW approved migration.
-- Restores original IDs, not clones. Review any new activity before approval.
-- Existing row-ID conflicts abort the entire restore; no overwriting new progress.
DO $restore$
DECLARE
 snapshot jsonb;
 tbl text;
 row_data jsonb;
BEGIN
 SELECT payload INTO snapshot FROM public.participant_reset_backups
 WHERE operation_key='reset-stream-8-20261104' FOR UPDATE;
 IF snapshot IS NULL THEN RAISE EXCEPTION 'Recovery snapshot missing'; END IF;
 -- Parents before children. Existing booking notification behavior is retained.
 FOREACH tbl IN ARRAY ARRAY['activity_checkins','homework_submissions','ascetic_activities','journal_entries','journal_answers','journal_emotions','participant_checkpoints','participant_weekly_summaries','schedule_participants'] LOOP
  EXECUTE format('INSERT INTO public.%I SELECT * FROM jsonb_populate_recordset(NULL::public.%I,$1)',tbl,tbl)
  USING snapshot->tbl;
 END LOOP;
 FOR row_data IN SELECT value FROM jsonb_array_elements(snapshot->'leaderboard') LOOP
  UPDATE public.leaderboard SET
   total_points=(row_data->>'total_points')::integer,
   bjj_points=(row_data->>'bjj_points')::integer,
   kickboxing_points=(row_data->>'kickboxing_points')::integer,
   ofp_points=(row_data->>'ofp_points')::integer,
   theory_points=(row_data->>'theory_points')::integer,
   challenges_points=(row_data->>'challenges_points')::integer,
   tactical_points=(row_data->>'tactical_points')::integer,
   monthly_points=(row_data->>'monthly_points')::integer,
   kamp_pyramid_points=(row_data->>'kamp_pyramid_points')::integer,
   nutrition_points=(row_data->>'nutrition_points')::integer,
   rank_position=(row_data->>'rank_position')::integer,
   last_updated=(row_data->>'last_updated')::timestamptz
  WHERE user_id=(row_data->>'user_id')::uuid;
 END LOOP;
 FOR row_data IN SELECT value FROM jsonb_array_elements(snapshot->'profiles') LOOP
  UPDATE public.profiles SET total_points=(row_data->>'total_points')::integer,
   rank_position=(row_data->>'rank_position')::integer
  WHERE user_id=(row_data->>'user_id')::uuid;
 END LOOP;
 FOR row_data IN SELECT value FROM jsonb_array_elements(snapshot->'public_profiles') LOOP
  UPDATE public.public_profiles SET total_points=(row_data->>'total_points')::integer,
   rank_position=(row_data->>'rank_position')::integer,updated_at=now()
  WHERE user_id=(row_data->>'user_id')::uuid;
 END LOOP;
END;
$restore$;