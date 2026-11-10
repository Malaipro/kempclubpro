-- КЭМП / resident-checkins-1 (DOWN). Откат. Колонки удаляются вместе с отметками — перед откатом сохранить их.
BEGIN;
DROP FUNCTION IF EXISTS public.founder_set_event_kind(uuid, text, date);
DROP FUNCTION IF EXISTS public.founder_confirm_attendance(uuid, jsonb);
DROP FUNCTION IF EXISTS public.founder_get_event_attendance(uuid);
DROP FUNCTION IF EXISTS public.request_attendance_web(uuid);
DROP FUNCTION IF EXISTS public.get_resident_checkins_web(integer);
DROP FUNCTION IF EXISTS public.club_week_start(timestamptz, date);
DROP TRIGGER IF EXISTS trg_guard_schedule_participant_attendance ON public.schedule_participants;
DROP FUNCTION IF EXISTS public.guard_schedule_participant_attendance();
DROP TRIGGER IF EXISTS trg_validate_schedule_club_kind ON public.schedules;
DROP FUNCTION IF EXISTS public.validate_schedule_club_kind();
ALTER TABLE public.schedules DROP COLUMN IF EXISTS week_anchor, DROP COLUMN IF EXISTS club_kind;
ALTER TABLE public.schedule_participants
  DROP COLUMN IF EXISTS attendance_history, DROP COLUMN IF EXISTS attended_marked_by,
  DROP COLUMN IF EXISTS attended_marked_at, DROP COLUMN IF EXISTS self_marked_at;
DROP FUNCTION IF EXISTS public.is_kemp_founder(uuid);
-- Restore the captured production web wrapper; shared server_register_for_event is unchanged.
CREATE OR REPLACE FUNCTION public.register_for_event_web(p_schedule_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_user_id uuid := auth.uid();
BEGIN
 IF v_user_id IS NULL THEN RETURN jsonb_build_object('ok',false,'error','not_authenticated'); END IF;
 RETURN public.server_register_for_event(v_user_id,p_schedule_id);
END $$;
-- ACL intentionally remains auth-only. Restore captured grants separately if required after review.
COMMIT;
