-- ============================================
-- Script de Importação para VPS
-- Execute após criar o schema (01-create-schema.sql)
-- ============================================

-- IMPORTANTE: Antes de importar, certifique-se de que:
-- 1. O schema foi criado com sucesso
-- 2. Os arquivos CSV ou SQL estão disponíveis
-- 3. As restrições de FK podem ser desabilitadas temporariamente

-- ============================================
-- Desabilitar triggers temporariamente
-- ============================================
SET session_replication_role = replica;

-- ============================================
-- Opção 1: Importar de arquivos CSV
-- ============================================

-- Usuários (primeiro, pois outras tabelas dependem)
-- \COPY users(id, email, password_hash, email_confirmed_at, created_at, updated_at, last_sign_in_at, is_active) FROM '/data/users.csv' WITH CSV HEADER;

-- Profiles
-- \COPY profiles(id, full_name, phone, avatar_url, avatar_updated_at, created_at, updated_at) FROM '/data/profiles.csv' WITH CSV HEADER;

-- User roles
-- \COPY user_roles(id, user_id, role, assigned_at, assigned_by) FROM '/data/user_roles.csv' WITH CSV HEADER;

-- Buildings
-- \COPY buildings FROM '/data/buildings.csv' WITH CSV HEADER;

-- Floors
-- \COPY floors FROM '/data/floors.csv' WITH CSV HEADER;

-- Rooms
-- \COPY rooms FROM '/data/rooms.csv' WITH CSV HEADER;

-- Racks
-- \COPY racks FROM '/data/racks.csv' WITH CSV HEADER;

-- Equipment
-- \COPY equipment FROM '/data/equipment.csv' WITH CSV HEADER;

-- Ports
-- \COPY ports FROM '/data/ports.csv' WITH CSV HEADER;

-- Connections
-- \COPY connections FROM '/data/connections.csv' WITH CSV HEADER;

-- Labels
-- \COPY labels FROM '/data/labels.csv' WITH CSV HEADER;

-- Support tickets
-- \COPY support_tickets FROM '/data/support_tickets.csv' WITH CSV HEADER;

-- Ticket comments
-- \COPY ticket_comments FROM '/data/ticket_comments.csv' WITH CSV HEADER;

-- Alerts
-- \COPY alerts FROM '/data/alerts.csv' WITH CSV HEADER;

-- Alert settings (pode substituir os dados padrão)
-- DELETE FROM alert_settings;
-- \COPY alert_settings FROM '/data/alert_settings.csv' WITH CSV HEADER;

-- Notification settings
-- \COPY notification_settings FROM '/data/notification_settings.csv' WITH CSV HEADER;

-- System settings (pode substituir os dados padrão)
-- DELETE FROM system_settings WHERE setting_key NOT IN (SELECT setting_key FROM system_settings);
-- \COPY system_settings FROM '/data/system_settings.csv' WITH CSV HEADER;

-- Access logs
-- \COPY access_logs FROM '/data/access_logs.csv' WITH CSV HEADER;

-- Rack annotations
-- \COPY rack_annotations FROM '/data/rack_annotations.csv' WITH CSV HEADER;

-- WhatsApp groups
-- \COPY whatsapp_groups FROM '/data/whatsapp_groups.csv' WITH CSV HEADER;

-- WhatsApp notifications
-- \COPY whatsapp_notifications FROM '/data/whatsapp_notifications.csv' WITH CSV HEADER;

-- WhatsApp sessions (geralmente pode ignorar - são temporárias)
-- \COPY whatsapp_sessions FROM '/data/whatsapp_sessions.csv' WITH CSV HEADER;

-- WhatsApp message mapping
-- \COPY whatsapp_message_mapping FROM '/data/whatsapp_message_mapping.csv' WITH CSV HEADER;

-- WhatsApp templates (pode substituir os dados padrão)
-- DELETE FROM whatsapp_templates;
-- \COPY whatsapp_templates FROM '/data/whatsapp_templates.csv' WITH CSV HEADER;

-- ============================================
-- Reabilitar triggers
-- ============================================
SET session_replication_role = DEFAULT;

-- ============================================
-- Atualizar sequences para continuar de onde parou
-- ============================================

-- Como usamos UUIDs, não precisamos atualizar sequences
-- Mas se houver campos SERIAL, use:
-- SELECT setval('nome_sequence', (SELECT MAX(id) FROM tabela));

-- ============================================
-- Verificação pós-importação
-- ============================================

SELECT 'users' as tabela, COUNT(*) as registros FROM users
UNION ALL SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL SELECT 'user_roles', COUNT(*) FROM user_roles
UNION ALL SELECT 'buildings', COUNT(*) FROM buildings
UNION ALL SELECT 'floors', COUNT(*) FROM floors
UNION ALL SELECT 'rooms', COUNT(*) FROM rooms
UNION ALL SELECT 'racks', COUNT(*) FROM racks
UNION ALL SELECT 'equipment', COUNT(*) FROM equipment
UNION ALL SELECT 'ports', COUNT(*) FROM ports
UNION ALL SELECT 'connections', COUNT(*) FROM connections
UNION ALL SELECT 'labels', COUNT(*) FROM labels
UNION ALL SELECT 'support_tickets', COUNT(*) FROM support_tickets
UNION ALL SELECT 'ticket_comments', COUNT(*) FROM ticket_comments
UNION ALL SELECT 'alerts', COUNT(*) FROM alerts
UNION ALL SELECT 'whatsapp_groups', COUNT(*) FROM whatsapp_groups
ORDER BY tabela;

-- ============================================
-- Verificar integridade referencial
-- ============================================

-- Verificar se todos os profiles têm users correspondentes
SELECT COUNT(*) as orphan_profiles 
FROM profiles p 
LEFT JOIN users u ON u.id = p.id 
WHERE u.id IS NULL;

-- Verificar se todos os floors têm buildings
SELECT COUNT(*) as orphan_floors 
FROM floors f 
LEFT JOIN buildings b ON b.id = f.building_id 
WHERE b.id IS NULL;

-- Verificar se todos os rooms têm floors
SELECT COUNT(*) as orphan_rooms 
FROM rooms r 
LEFT JOIN floors f ON f.id = r.floor_id 
WHERE f.id IS NULL;

-- Verificar se todos os racks têm rooms
SELECT COUNT(*) as orphan_racks 
FROM racks r 
LEFT JOIN rooms rm ON rm.id = r.room_id 
WHERE rm.id IS NULL;

-- Verificar se todos os equipment têm racks
SELECT COUNT(*) as orphan_equipment 
FROM equipment e 
LEFT JOIN racks r ON r.id = e.rack_id 
WHERE r.id IS NULL;

-- Verificar se todos os ports têm equipment
SELECT COUNT(*) as orphan_ports 
FROM ports p 
LEFT JOIN equipment e ON e.id = p.equipment_id 
WHERE e.id IS NULL;

-- Verificar connections
SELECT COUNT(*) as orphan_connections 
FROM connections c 
LEFT JOIN ports pa ON pa.id = c.port_a_id 
LEFT JOIN ports pb ON pb.id = c.port_b_id 
WHERE pa.id IS NULL OR pb.id IS NULL;

-- ============================================
-- Criar usuário admin se não existir
-- ============================================

-- Inserir usuário admin padrão (senha: admin123 - ALTERAR EM PRODUÇÃO!)
-- A senha deve ser hash bcrypt
INSERT INTO users (id, email, password_hash, email_confirmed_at, is_active)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  'admin@sistema.local',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYOuQTCNWKHm', -- admin123
  NOW(),
  true
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@sistema.local');

-- Criar profile para admin
INSERT INTO profiles (id, full_name)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  'Administrador'
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE id = '00000000-0000-0000-0000-000000000001');

-- Atribuir role admin
INSERT INTO user_roles (user_id, role)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = '00000000-0000-0000-0000-000000000001' AND role = 'admin'
);

COMMIT;

SELECT 'Importação concluída com sucesso!' as status;
