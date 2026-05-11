ALTER TABLE public.ai_settings
  ADD COLUMN IF NOT EXISTS whatsapp_max_length integer NOT NULL DEFAULT 3500;