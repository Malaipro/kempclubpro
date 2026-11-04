BEGIN;
LOCK TABLE public.streams IN SHARE ROW EXCLUSIVE MODE;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.streams WHERE name='8-й поток' AND id<>'c4fcd7b8-0826-4ac3-96b0-faf8d1c00808') THEN RAISE EXCEPTION 'Stream 8 already exists with a different ID'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.streams WHERE id='e73c9458-21a9-4a8c-9646-08b60ae77998') THEN RAISE EXCEPTION 'Source stream missing'; END IF;
END $$;
INSERT INTO public.streams(id,name,start_date,end_date,max_participants,is_active,stream_type)
VALUES('c4fcd7b8-0826-4ac3-96b0-faf8d1c00808','8-й поток','2026-11-08','2026-12-26',20,false,'intensive') ON CONFLICT(id) DO NOTHING;
UPDATE public.streams SET is_active=false WHERE stream_type='intensive' AND is_active AND id<>'c4fcd7b8-0826-4ac3-96b0-faf8d1c00808';
UPDATE public.streams SET is_active=true WHERE id='c4fcd7b8-0826-4ac3-96b0-faf8d1c00808';
WITH manifest(day,starts,ends,title) AS (VALUES
('11-09','06:00','07:20','BJJ'),('11-09','07:30','08:30','Лекция Пирамида КЭМП'),
('11-11','06:00','07:20','ОФП'),('11-11','07:30','08:30','Пирамида практика'),
('11-13','06:00','07:20','Кикбоксинг'),('11-13','07:30','08:30','Нутрициология'),
('11-16','06:00','07:20','BJJ'),('11-16','07:30','08:30','Лекция Пирамида КЭМП'),
('11-18','06:00','07:20','ОФП'),('11-18','07:30','08:30','Пирамида практика'),
('11-20','06:00','07:20','Кикбоксинг'),('11-22','06:00','15:00','Тактическая подготовка'),
('11-23','06:00','07:20','BJJ'),('11-25','06:00','07:20','ОФП'),('11-25','07:30','08:30','Лекция Пирамида КЭМП'),
('11-27','06:00','07:20','Кикбоксинг'),('11-27','07:30','08:30','Нутрициология'),('11-29','07:00','13:30','Тактическая подготовка'),
('11-30','06:00','07:20','BJJ'),('11-30','08:00','09:30','Лекция Пирамида КЭМП'),
('12-02','06:00','07:20','ОФП'),('12-02','07:30','08:30','Пирамида практика'),
('12-04','06:00','07:20','Кикбоксинг'),('12-04','07:30','08:30','Нутрициология'),
('12-07','06:00','07:20','BJJ'),('12-07','07:30','08:30','Лекция Пирамида КЭМП'),
('12-09','06:00','08:00','Краш тест по BJJ'),('12-11','06:00','07:20','Кикбоксинг'),('12-11','07:30','08:30','Нутрициология'),
('12-14','06:00','07:20','Кикбоксинг'),('12-14','07:30','08:30','Пирамида практика'),
('12-16','06:00','08:00','Краш тест по кикбоксингу'),('12-18','06:00','07:20','BJJ'),('12-19','06:00','16:30','Тактическая подготовка'),
('12-21','06:00','07:20','BJJ'),('12-23','06:00','07:30','ОФП'),('12-25','06:00','07:30','Кикбоксинг'),
('12-25','07:40','08:40','Нутрициология'),('12-26','10:00','13:00','Гонка Героев')
), planned AS (
 SELECT md5('kemp-stream8:'||day||':'||starts||':'||title)::uuid AS id,title,
 ('2026-'||day||' '||starts||':00+03')::timestamptz AS starts,
 ('2026-'||day||' '||ends||':00+03')::timestamptz AS ends FROM manifest
)
INSERT INTO public.schedules(id,title,description,activity_type,start_time,end_time,instructor_id,max_participants,location,is_active,color,schedule_type,stream_id,mastermind_group_id)
SELECT p.id,p.title,t.description,t.activity_type,p.starts,p.ends,t.instructor_id,t.max_participants,t.location,true,t.color,'intensive','c4fcd7b8-0826-4ac3-96b0-faf8d1c00808',NULL
FROM planned p CROSS JOIN LATERAL (
 SELECT s.* FROM public.schedules s WHERE s.stream_id='e73c9458-21a9-4a8c-9646-08b60ae77998' AND s.title=p.title ORDER BY abs(extract(epoch FROM ((s.end_time-s.start_time)-(p.ends-p.starts)))),s.start_time,s.id LIMIT 1
) t ON CONFLICT(id) DO NOTHING;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.schedules WHERE stream_id='c4fcd7b8-0826-4ac3-96b0-faf8d1c00808')<>39 THEN RAISE EXCEPTION 'Expected 39 events'; END IF;
 IF EXISTS(SELECT 1 FROM public.schedules WHERE stream_id='c4fcd7b8-0826-4ac3-96b0-faf8d1c00808' AND (end_time<=start_time OR (start_time AT TIME ZONE 'Europe/Moscow')::date<'2026-11-08' OR (end_time AT TIME ZONE 'Europe/Moscow')::date>'2026-12-26')) THEN RAISE EXCEPTION 'Invalid event dates'; END IF;
 IF (SELECT count(*) FROM public.streams WHERE is_active AND stream_type='intensive')<>1 THEN RAISE EXCEPTION 'Expected one active intensive'; END IF;
END $$;
COMMIT;