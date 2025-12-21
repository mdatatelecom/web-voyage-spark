-- Add WhatsApp notification columns to notification_settings table
ALTER TABLE public.notification_settings
ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp_phone text,
ADD COLUMN IF NOT EXISTS whatsapp_alert_critical boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS whatsapp_alert_warning boolean DEFAULT false;