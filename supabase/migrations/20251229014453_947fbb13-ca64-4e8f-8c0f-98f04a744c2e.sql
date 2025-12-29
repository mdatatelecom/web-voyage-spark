-- Add column for WhatsApp resolved notifications preference
ALTER TABLE notification_settings 
ADD COLUMN IF NOT EXISTS whatsapp_alert_resolved boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN notification_settings.whatsapp_alert_resolved IS 'Whether to send WhatsApp notification when alerts are auto-resolved';