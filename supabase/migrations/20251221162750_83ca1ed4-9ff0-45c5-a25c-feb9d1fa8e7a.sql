-- Add phone column to profiles table for WhatsApp integration
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;

-- Create index for fast lookup by phone
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);