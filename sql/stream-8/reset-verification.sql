-- Read-only regression tests for the approved 2026-11-04 reset.
-- Every row must have passed=true. Never prints snapshot/private content.
WITH selected AS (
 SELECT * FROM public.profiles WHERE user_id IN (
 '8f2a4afa-afb4-4c45-9c26-e19e443caf13',
 '00fa3ae5-e4ff-4fe7-909a-06481aa300fa',
 'fb2d633b-8bc8-4e8f-8ad4-855edeb869ba')
), backup AS (
 SELECT payload FROM public.participant_reset_backups
 WHERE operation_key='reset-stream-8-20261104'
)
SELECT 'three approved participants remain in stream 8' AS rule,
 count(*)=3 AND bool_and(current_stream_id='c4fcd7b8-0826-4ac3-96b0-faf8d1c00808'::uuid AND participant_status='intensive_active') AS passed FROM selected
UNION ALL SELECT 'profile points and ranks are zero',count(*)=3 AND bool_and(total_points=0 AND rank_position=0) FROM selected
UNION ALL SELECT 'leaderboard points and ranks are zero',count(*)=3 AND bool_and(l.total_points=0 AND l.rank_position=0) FROM public.leaderboard l JOIN selected s USING(user_id)
UNION ALL SELECT 'calculated ratings are zero',count(*)=3 AND bool_and(public.calculate_participant_rating(user_id,current_stream_id)=0) FROM selected
UNION ALL SELECT 'coins preserved: Anvar 5, Stanislav 0, Dmitriy 0',count(*)=3 AND bool_and(public.get_user_coin_balance(user_id)=CASE WHEN user_id='8f2a4afa-afb4-4c45-9c26-e19e443caf13'::uuid THEN 5 ELSE 0 END) FROM selected
UNION ALL SELECT 'all 451 removed progress records have a recovery snapshot',count(*)=1 AND bool_and((SELECT sum(jsonb_array_length(value)) FROM jsonb_each(payload) WHERE key NOT IN ('profiles','leaderboard','public_profiles'))=451) FROM backup
UNION ALL SELECT 'no selected visits remain',NOT EXISTS(SELECT 1 FROM public.activity_checkins WHERE user_id IN (SELECT user_id FROM selected))
UNION ALL SELECT 'no selected homework submissions remain',NOT EXISTS(SELECT 1 FROM public.homework_submissions WHERE user_id IN (SELECT user_id FROM selected))
UNION ALL SELECT 'no selected ascetic progress remains',NOT EXISTS(SELECT 1 FROM public.ascetic_activities WHERE user_id IN (SELECT user_id FROM selected))
UNION ALL SELECT 'no selected journal entries remain',NOT EXISTS(SELECT 1 FROM public.journal_entries WHERE user_id IN (SELECT user_id FROM selected))
UNION ALL SELECT 'no archived journal answers remain',NOT EXISTS(SELECT 1 FROM public.journal_answers WHERE entry_id IN (SELECT (e->>'id')::uuid FROM backup CROSS JOIN LATERAL jsonb_array_elements(payload->'journal_entries') e))
UNION ALL SELECT 'no archived journal emotions remain',NOT EXISTS(SELECT 1 FROM public.journal_emotions WHERE entry_id IN (SELECT (e->>'id')::uuid FROM backup CROSS JOIN LATERAL jsonb_array_elements(payload->'journal_entries') e))
UNION ALL SELECT 'no selected checkpoints remain',NOT EXISTS(SELECT 1 FROM public.participant_checkpoints WHERE user_id IN (SELECT user_id FROM selected))
UNION ALL SELECT 'no selected weekly summaries remain',NOT EXISTS(SELECT 1 FROM public.participant_weekly_summaries WHERE user_id IN (SELECT user_id FROM selected))
UNION ALL SELECT 'no selected bookings remain',NOT EXISTS(SELECT 1 FROM public.schedule_participants WHERE user_id IN (SELECT user_id FROM selected))
UNION ALL SELECT 'backup is inaccessible to visitors and participants',NOT has_table_privilege('anon','public.participant_reset_backups','SELECT') AND NOT has_table_privilege('authenticated','public.participant_reset_backups','SELECT');