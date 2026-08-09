-- =====================================================================
-- 01_extensions_and_types.sql
-- Проект: МИРА (структурный перенос схемы КЭМП)
-- Содержит: расширения, схемы, enum-типы. Данных нет.
-- =====================================================================

-- ---------- EXTENSIONS ----------
CREATE SCHEMA IF NOT EXISTS extensions;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp"        WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto           WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net             WITH SCHEMA extensions;
-- pg_cron ставится в pg_catalog, создаётся Supabase-платформой:
CREATE EXTENSION IF NOT EXISTS pg_cron;
-- supabase_vault (схема vault) и plpgsql уже присутствуют в чистом проекте Supabase.

-- ---------- ENUM TYPES (13) ----------
CREATE TYPE public.activity_type AS ENUM ('training_bjj', 'training_kick', 'training_ofp', 'lecture', 'homework', 'crash_test_bjj', 'crash_test_kick', 'hero_race', 'tactics', 'ascetic_challenge');
CREATE TYPE public.activity_type_new AS ENUM ('training', 'lecture', 'homework', 'crash_test_bjj', 'crash_test_kick', 'heroes_race', 'tactics', 'ascetic');
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.journal_day_type AS ENUM ('weekday', 'saturday', 'sunday');
CREATE TYPE public.lecture_subtype AS ENUM ('kemp', 'nutrition', 'psychology', 'philosophy', 'leadership', 'tactics');
CREATE TYPE public.participant_status_type AS ENUM ('intensive_active', 'intensive_completed', 'club_resident', 'alumni', 'inactive', 'intensive_failed', 'trial_visit', 'intensive_dropped');
CREATE TYPE public.reward_type AS ENUM ('zakal', 'gran', 'shram');
CREATE TYPE public.schedule_type AS ENUM ('intensive', 'club');
CREATE TYPE public.shram_subtype AS ENUM ('bjj', 'kick', 'ofp', 'tactics');
CREATE TYPE public.totem_type AS ENUM ('snake', 'paw', 'hammer', 'star', 'sprout', 'compass', 'monk', 'blade', 'lighthouse', 'bear');
CREATE TYPE public.training_subtype AS ENUM ('bjj', 'kick', 'ofp');
CREATE TYPE public.user_role AS ENUM ('user', 'admin', 'super_admin', 'trainer');
CREATE TYPE public.zakal_subtype AS ENUM ('bjj', 'kick', 'ofp');
