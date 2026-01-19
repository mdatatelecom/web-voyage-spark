-- Adicionar configurações do Zabbix na tabela alert_settings
INSERT INTO public.alert_settings (setting_key, setting_value, description) VALUES
  ('zabbix_enabled', 1, 'Habilitar integração com Zabbix'),
  ('zabbix_whatsapp_enabled', 1, 'Habilitar notificações WhatsApp para alertas Zabbix'),
  ('zabbix_min_severity', 2, 'Severidade mínima para notificações: 1=info, 2=warning, 3=critical')
ON CONFLICT (setting_key) DO NOTHING;

-- Adicionar zabbix_base_url na tabela system_settings
INSERT INTO public.system_settings (setting_key, setting_value) VALUES
  ('zabbix_base_url', '""')
ON CONFLICT (setting_key) DO NOTHING;

-- Adicionar campo zabbix_host_id na tabela equipment
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS zabbix_host_id TEXT;