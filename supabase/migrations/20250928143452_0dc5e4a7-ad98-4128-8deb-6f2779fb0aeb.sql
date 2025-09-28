-- Create a secure public-facing table for approved, visible participants
-- This replaces the dropped view and avoids SECURITY DEFINER view risks

-- 1) Table
CREATE TABLE IF NOT EXISTS public.public_profiles (
  id uuid PRIMARY KEY,                 -- mirrors profiles.id
  user_id uuid NOT NULL,               -- mirrors profiles.user_id
  display_name text,
  first_name text,
  last_name text,
  total_points integer DEFAULT 0,
  rank_position integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT public_profiles_profiles_fk FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS public_profiles_user_id_uk ON public.public_profiles(user_id);

-- 2) RLS: public read-only; no public writes
ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- allow anyone to read public profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'public_profiles' AND policyname = 'Public can read public profiles'
  ) THEN
    CREATE POLICY "Public can read public profiles"
    ON public.public_profiles
    FOR SELECT
    USING (true);
  END IF;

  -- Only admins or definer functions (triggers) can modify; no general write policies
END $$;

-- 3) Timestamp trigger helper
CREATE OR REPLACE FUNCTION public.update_timestamp_public_profiles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_public_profiles_updated_at ON public.public_profiles;
CREATE TRIGGER trg_public_profiles_updated_at
BEFORE UPDATE ON public.public_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_timestamp_public_profiles();

-- 4) Sync function from profiles
CREATE OR REPLACE FUNCTION public.sync_public_profiles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- On DELETE from profiles: remove from public_profiles
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.public_profiles WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  -- Check visibility conditions on NEW row
  IF COALESCE(NEW.approved, false) = true
     AND COALESCE(NEW.leaderboard_visible, true) = true
     AND COALESCE(NEW.profile_private, false) = false THEN
    -- Upsert
    INSERT INTO public.public_profiles AS pp (
      id, user_id, display_name, first_name, last_name, total_points, rank_position, created_at, updated_at
    ) VALUES (
      NEW.id, NEW.user_id, NEW.display_name, NEW.first_name, NEW.last_name,
      COALESCE(NEW.total_points, 0), COALESCE(NEW.rank_position, 0), now(), now()
    )
    ON CONFLICT (id) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      display_name = EXCLUDED.display_name,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      total_points = EXCLUDED.total_points,
      rank_position = EXCLUDED.rank_position,
      updated_at = now();
  ELSE
    -- If no longer eligible, remove
    DELETE FROM public.public_profiles WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to profiles
DROP TRIGGER IF EXISTS trg_profiles_sync_public ON public.profiles;
CREATE TRIGGER trg_profiles_sync_public
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_public_profiles();

-- 5) Sync function from leaderboard to keep points fresh
CREATE OR REPLACE FUNCTION public.sync_public_profiles_from_leaderboard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
BEGIN
  -- Get profile to check visibility flags
  SELECT * INTO v_profile FROM public.profiles WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);

  IF v_profile IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF COALESCE(v_profile.approved, false) = true
     AND COALESCE(v_profile.leaderboard_visible, true) = true
     AND COALESCE(v_profile.profile_private, false) = false THEN
    UPDATE public.public_profiles
    SET total_points = COALESCE(NEW.total_points, 0),
        rank_position = COALESCE(NEW.rank_position, 0),
        updated_at = now()
    WHERE user_id = v_profile.user_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_leaderboard_sync_public ON public.leaderboard;
CREATE TRIGGER trg_leaderboard_sync_public
AFTER INSERT OR UPDATE OR DELETE ON public.leaderboard
FOR EACH ROW EXECUTE FUNCTION public.sync_public_profiles_from_leaderboard();

-- 6) Initial backfill
INSERT INTO public.public_profiles (id, user_id, display_name, first_name, last_name, total_points, rank_position)
SELECT p.id, p.user_id, p.display_name, p.first_name, p.last_name, COALESCE(p.total_points,0), COALESCE(p.rank_position,0)
FROM public.profiles p
WHERE COALESCE(p.approved, false) = true
  AND COALESCE(p.leaderboard_visible, true) = true
  AND COALESCE(p.profile_private, false) = false
ON CONFLICT (id) DO NOTHING;