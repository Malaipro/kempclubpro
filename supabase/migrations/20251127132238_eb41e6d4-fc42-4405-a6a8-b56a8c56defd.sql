-- Создаем функцию для проверки статуса резидента клуба
CREATE OR REPLACE FUNCTION public.is_club_resident(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND participant_status = 'club_resident'
      AND approved = true
  );
$$;

-- Удаляем старую публичную политику для расписания
DROP POLICY IF EXISTS "Schedules are publicly viewable" ON public.schedules;

-- Создаем новые политики с разделением по типу расписания
CREATE POLICY "Intensive schedules are publicly viewable"
ON public.schedules
FOR SELECT
USING (schedule_type = 'intensive' AND is_active = true);

CREATE POLICY "Club schedules are viewable by club residents"
ON public.schedules
FOR SELECT
USING (
  schedule_type = 'club' 
  AND is_active = true 
  AND (
    public.is_club_resident(auth.uid())
    OR public.is_admin(auth.uid())
  )
);

-- Обновляем политику регистрации на мероприятия
DROP POLICY IF EXISTS "Users can register for schedules" ON public.schedule_participants;

CREATE POLICY "Club residents can register for club schedules"
ON public.schedule_participants
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (
    public.is_club_resident(auth.uid())
    OR public.is_admin(auth.uid())
  )
);