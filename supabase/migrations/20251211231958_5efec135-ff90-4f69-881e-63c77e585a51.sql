-- Adicionar novo tipo de alerta para PoE capacity
ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'poe_capacity';

-- Inserir configurações de threshold PoE
INSERT INTO alert_settings (setting_key, setting_value, description)
VALUES 
  ('poe_warning_threshold', 80, 'PoE budget warning threshold (%)'),
  ('poe_critical_threshold', 90, 'PoE budget critical threshold (%)')
ON CONFLICT (setting_key) DO NOTHING;