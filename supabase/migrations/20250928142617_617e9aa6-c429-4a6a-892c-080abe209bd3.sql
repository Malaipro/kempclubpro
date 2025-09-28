-- Fix security definer view issue by dropping the public_profiles view
-- This view was bypassing RLS policies and creating a security vulnerability
DROP VIEW IF EXISTS public.public_profiles;

-- The leaderboard functionality should use direct queries with proper RLS policies instead
-- No need to recreate this view as the existing RLS policies on profiles table are sufficient