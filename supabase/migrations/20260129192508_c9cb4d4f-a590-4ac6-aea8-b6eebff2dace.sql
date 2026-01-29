-- Adicionar tipo 'epi_alert' ao ENUM alert_type
ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'epi_alert';

-- Adicionar configurações EPI Monitor em alert_settings
INSERT INTO public.alert_settings (setting_key, setting_value, description)
VALUES 
  ('epi_enabled', 1, 'Habilitar integração EPI Monitor'),
  ('epi_whatsapp_enabled', 1, 'Enviar notificações WhatsApp para alertas EPI'),
  ('epi_min_severity', 2, 'Severidade mínima para notificar EPI (1=info, 2=warning, 3=critical)')
ON CONFLICT (setting_key) DO NOTHING;