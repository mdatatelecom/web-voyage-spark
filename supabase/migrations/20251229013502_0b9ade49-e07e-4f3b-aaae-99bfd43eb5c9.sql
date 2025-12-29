-- Adicionar novos tipos de alerta ao enum alert_type
ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'nvr_full';
ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'camera_unassigned';
ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'connection_faulty';
ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'connection_stale_testing';
ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'equipment_no_ip';

-- Inserir novas configurações de alertas
INSERT INTO alert_settings (setting_key, setting_value, description) VALUES
('nvr_warning_threshold', 80, 'Percentual de canais NVR para alerta warning'),
('nvr_critical_threshold', 100, 'Percentual de canais NVR para alerta critical'),
('camera_orphan_alert_enabled', 1, 'Alertar sobre câmeras sem NVR (1=ativo, 0=desativado)'),
('connection_faulty_alert_enabled', 1, 'Alertar sobre conexões com defeito (1=ativo, 0=desativado)'),
('testing_max_days', 7, 'Dias máximos em status testing antes de alertar'),
('equipment_no_ip_alert_enabled', 1, 'Alertar sobre equipamentos de rede sem IP (1=ativo, 0=desativado)')
ON CONFLICT (setting_key) DO NOTHING;