-- Create notification_settings table for email preferences
CREATE TABLE public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  alert_critical BOOLEAN NOT NULL DEFAULT true,
  alert_warning BOOLEAN NOT NULL DEFAULT true,
  alert_info BOOLEAN NOT NULL DEFAULT false,
  email_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Users can view and update their own settings
CREATE POLICY "Users can view their own notification settings"
ON public.notification_settings
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own notification settings"
ON public.notification_settings
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own notification settings"
ON public.notification_settings
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Admins can view all settings
CREATE POLICY "Admins can view all notification settings"
ON public.notification_settings
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

-- Trigger for updated_at
CREATE TRIGGER update_notification_settings_updated_at
BEFORE UPDATE ON public.notification_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();