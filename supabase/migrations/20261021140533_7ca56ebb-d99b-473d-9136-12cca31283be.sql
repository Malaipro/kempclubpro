CREATE OR REPLACE FUNCTION public.mm_task_set_track() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.track_id IS NULL THEN
    SELECT t.id INTO NEW.track_id FROM public.mastermind_tracks t JOIN public.mastermind_members m ON m.group_id=t.group_id
     WHERE m.id=NEW.member_id AND t.status='active' AND current_date BETWEEN t.start_date AND t.end_date
     ORDER BY t.start_date DESC LIMIT 1;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.mm_task_set_track() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_mm_task_set_track BEFORE INSERT ON public.mastermind_tasks FOR EACH ROW EXECUTE FUNCTION public.mm_task_set_track();