-- Add new fields to profiles table for contract data
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS middle_name TEXT,
ADD COLUMN IF NOT EXISTS personal_data_consent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS personal_data_consent_date TIMESTAMP WITH TIME ZONE;