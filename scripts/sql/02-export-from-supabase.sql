-- ============================================
-- Script de Exportação do Supabase
-- Execute este script conectado ao Supabase
-- ============================================

-- IMPORTANTE: Este script deve ser executado via pg_dump ou 
-- manualmente no SQL Editor do Supabase

-- Opção 1: Usando pg_dump (recomendado)
-- pg_dump -h <SUPABASE_HOST> -U postgres -d postgres --data-only --no-owner --no-privileges -t public.buildings -t public.floors -t public.rooms -t public.racks -t public.equipment -t public.ports -t public.connections -t public.labels -t public.support_tickets -t public.ticket_comments -t public.alerts -t public.alert_settings -t public.notification_settings -t public.system_settings -t public.access_logs -t public.whatsapp_groups -t public.whatsapp_notifications -t public.whatsapp_sessions -t public.whatsapp_message_mapping -t public.whatsapp_templates -t public.rack_annotations > supabase_data.sql

-- Opção 2: COPY para CSV (execute cada comando separadamente)

-- Exportar buildings
-- COPY (SELECT * FROM buildings) TO '/tmp/buildings.csv' WITH CSV HEADER;

-- Exportar floors
-- COPY (SELECT * FROM floors) TO '/tmp/floors.csv' WITH CSV HEADER;

-- Exportar rooms
-- COPY (SELECT * FROM rooms) TO '/tmp/rooms.csv' WITH CSV HEADER;

-- Exportar racks
-- COPY (SELECT * FROM racks) TO '/tmp/racks.csv' WITH CSV HEADER;

-- Exportar equipment
-- COPY (SELECT * FROM equipment) TO '/tmp/equipment.csv' WITH CSV HEADER;

-- Exportar ports
-- COPY (SELECT * FROM ports) TO '/tmp/ports.csv' WITH CSV HEADER;

-- Exportar connections
-- COPY (SELECT * FROM connections) TO '/tmp/connections.csv' WITH CSV HEADER;

-- Exportar labels
-- COPY (SELECT * FROM labels) TO '/tmp/labels.csv' WITH CSV HEADER;

-- Exportar support_tickets
-- COPY (SELECT * FROM support_tickets) TO '/tmp/support_tickets.csv' WITH CSV HEADER;

-- Exportar ticket_comments
-- COPY (SELECT * FROM ticket_comments) TO '/tmp/ticket_comments.csv' WITH CSV HEADER;

-- Exportar alerts
-- COPY (SELECT * FROM alerts) TO '/tmp/alerts.csv' WITH CSV HEADER;

-- Exportar alert_settings
-- COPY (SELECT * FROM alert_settings) TO '/tmp/alert_settings.csv' WITH CSV HEADER;

-- Exportar notification_settings
-- COPY (SELECT * FROM notification_settings) TO '/tmp/notification_settings.csv' WITH CSV HEADER;

-- Exportar system_settings
-- COPY (SELECT * FROM system_settings) TO '/tmp/system_settings.csv' WITH CSV HEADER;

-- Exportar whatsapp tables
-- COPY (SELECT * FROM whatsapp_groups) TO '/tmp/whatsapp_groups.csv' WITH CSV HEADER;
-- COPY (SELECT * FROM whatsapp_notifications) TO '/tmp/whatsapp_notifications.csv' WITH CSV HEADER;
-- COPY (SELECT * FROM whatsapp_sessions) TO '/tmp/whatsapp_sessions.csv' WITH CSV HEADER;
-- COPY (SELECT * FROM whatsapp_message_mapping) TO '/tmp/whatsapp_message_mapping.csv' WITH CSV HEADER;
-- COPY (SELECT * FROM whatsapp_templates) TO '/tmp/whatsapp_templates.csv' WITH CSV HEADER;

-- Exportar rack_annotations
-- COPY (SELECT * FROM rack_annotations) TO '/tmp/rack_annotations.csv' WITH CSV HEADER;

-- ============================================
-- Exportar Usuários do auth.users para users
-- ============================================

-- Este SELECT pode ser usado para gerar INSERTs
-- Execute no Supabase e salve o resultado

SELECT 
  'INSERT INTO users (id, email, password_hash, email_confirmed_at, created_at, updated_at, last_sign_in_at, is_active) VALUES (' ||
  quote_literal(u.id) || ', ' ||
  quote_literal(u.email) || ', ' ||
  quote_literal(COALESCE(u.encrypted_password, 'migrated_from_supabase')) || ', ' ||
  COALESCE(quote_literal(u.email_confirmed_at::text), 'NULL') || ', ' ||
  quote_literal(u.created_at) || ', ' ||
  quote_literal(COALESCE(u.updated_at, NOW())) || ', ' ||
  COALESCE(quote_literal(u.last_sign_in_at::text), 'NULL') || ', ' ||
  'true);'
FROM auth.users u;

-- Exportar profiles
SELECT 
  'INSERT INTO profiles (id, full_name, phone, avatar_url, avatar_updated_at, created_at, updated_at) VALUES (' ||
  quote_literal(p.id) || ', ' ||
  COALESCE(quote_literal(p.full_name), 'NULL') || ', ' ||
  COALESCE(quote_literal(p.phone), 'NULL') || ', ' ||
  COALESCE(quote_literal(p.avatar_url), 'NULL') || ', ' ||
  COALESCE(quote_literal(p.avatar_updated_at::text), 'NULL') || ', ' ||
  quote_literal(p.created_at) || ', ' ||
  quote_literal(p.updated_at) || ');'
FROM public.profiles p;

-- Exportar user_roles
SELECT 
  'INSERT INTO user_roles (id, user_id, role, assigned_at, assigned_by) VALUES (' ||
  quote_literal(ur.id) || ', ' ||
  quote_literal(ur.user_id) || ', ' ||
  quote_literal(ur.role) || ', ' ||
  quote_literal(ur.assigned_at) || ', ' ||
  COALESCE(quote_literal(ur.assigned_by::text), 'NULL') || ');'
FROM public.user_roles ur;

-- ============================================
-- Queries de contagem para verificação
-- ============================================

SELECT 'users' as tabela, COUNT(*) as registros FROM auth.users
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
