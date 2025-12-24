-- ============================================
-- Schema PostgreSQL para VPS Migration
-- Data Center Management System
-- ============================================

-- Criar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('admin', 'technician', 'viewer', 'network_viewer');

CREATE TYPE equipment_type AS ENUM (
  'switch', 'router', 'server', 'patch_panel', 'firewall', 'storage', 'other',
  'load_balancer', 'waf', 'access_point', 'pdu', 'ups', 'dvr', 'nvr',
  'pabx', 'voip_gateway', 'modem', 'olt', 'onu', 'kvm', 'console_server',
  'patch_panel_fiber', 'cable_organizer_horizontal', 'cable_organizer_vertical',
  'brush_panel', 'switch_poe', 'poe_injector', 'poe_splitter', 'pdu_smart',
  'ip_camera', 'media_converter', 'media_converter_chassis', 'environment_sensor',
  'rack_monitor', 'dslam', 'msan', 'fixed_shelf'
);

CREATE TYPE port_status AS ENUM ('available', 'in_use', 'reserved', 'disabled');

CREATE TYPE port_type AS ENUM (
  'rj45', 'sfp', 'sfp_plus', 'sfp28', 'qsfp', 'qsfp28', 'fiber_lc', 'fiber_sc',
  'bnc', 'hdmi', 'vga', 'usb', 'serial', 'console_rj45', 'console_usb',
  'fxo_fxs', 'e1_t1', 'power_ac', 'power_dc', 'antenna_sma', 'rs485_rs232',
  'io', 'other', 'rj45_poe', 'rj45_poe_plus', 'rj45_poe_plus_plus', 'sensor_io'
);

CREATE TYPE cable_type AS ENUM (
  'utp_cat5e', 'utp_cat6', 'utp_cat6a', 'fiber_om3', 'fiber_om4', 'fiber_os2', 'dac', 'other'
);

CREATE TYPE connection_status AS ENUM ('active', 'inactive', 'reserved', 'testing', 'faulty');

CREATE TYPE alert_type AS ENUM ('rack_capacity', 'port_capacity', 'equipment_failure', 'poe_capacity');

CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'critical');

CREATE TYPE alert_status AS ENUM ('active', 'acknowledged', 'resolved');

-- ============================================
-- TABELA DE USUÁRIOS (substitui auth.users)
-- ============================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_sign_in_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  phone VARCHAR(50),
  avatar_url TEXT,
  avatar_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id)
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  refresh_token TEXT UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELAS DE INFRAESTRUTURA
-- ============================================

CREATE TABLE buildings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  internal_code VARCHAR(50),
  building_type VARCHAR(100),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  contact_name VARCHAR(255),
  contact_phone VARCHAR(50),
  contact_email VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE floors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  floor_number INTEGER,
  area_sqm DECIMAL(10, 2),
  has_access_control BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  floor_id UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  room_type VARCHAR(100),
  capacity INTEGER,
  has_access_control BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE racks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  size_u INTEGER DEFAULT 42,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rack_id UUID NOT NULL REFERENCES racks(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type equipment_type NOT NULL,
  manufacturer VARCHAR(255),
  model VARCHAR(255),
  serial_number VARCHAR(255),
  asset_tag VARCHAR(100),
  hostname VARCHAR(255),
  ip_address VARCHAR(45),
  primary_mac_address VARCHAR(17),
  position_u_start INTEGER,
  position_u_end INTEGER,
  mount_side VARCHAR(20) DEFAULT 'front',
  airflow VARCHAR(20),
  power_consumption_watts INTEGER,
  weight_kg DECIMAL(6, 2),
  poe_budget_watts INTEGER,
  poe_power_per_port JSONB,
  equipment_status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  port_number INTEGER,
  port_type port_type,
  status port_status DEFAULT 'available',
  speed VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_code VARCHAR(50) UNIQUE NOT NULL,
  port_a_id UUID NOT NULL REFERENCES ports(id) ON DELETE CASCADE,
  port_b_id UUID NOT NULL REFERENCES ports(id) ON DELETE CASCADE,
  cable_type cable_type NOT NULL,
  cable_color VARCHAR(50),
  cable_length_meters DECIMAL(6, 2),
  status connection_status DEFAULT 'active',
  vlan_id INTEGER,
  vlan_name VARCHAR(100),
  vlan_tagging VARCHAR(50),
  installed_at TIMESTAMPTZ DEFAULT NOW(),
  installed_by VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE labels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  qr_code_data TEXT NOT NULL,
  label_file_url TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by UUID REFERENCES users(id),
  printed_at TIMESTAMPTZ,
  print_count INTEGER DEFAULT 0
);

CREATE TABLE rack_annotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rack_id UUID NOT NULL REFERENCES racks(id) ON DELETE CASCADE,
  position_u INTEGER NOT NULL,
  position_side VARCHAR(20),
  annotation_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(20),
  icon VARCHAR(50),
  priority VARCHAR(20),
  due_date TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELAS DE SUPORTE
-- ============================================

CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number VARCHAR(20) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'other',
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(50) DEFAULT 'open',
  created_by UUID NOT NULL REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  technician_phone VARCHAR(50),
  contact_phone VARCHAR(50),
  related_building_id UUID REFERENCES buildings(id),
  related_room_id UUID REFERENCES rooms(id),
  related_rack_id UUID REFERENCES racks(id),
  related_equipment_id UUID REFERENCES equipment(id),
  due_date TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  attachments JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ticket_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  source VARCHAR(50) DEFAULT 'web',
  whatsapp_sender_name VARCHAR(255),
  whatsapp_sender_phone VARCHAR(50),
  attachments JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELAS DE ALERTAS
-- ============================================

CREATE TABLE alert_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value INTEGER NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type alert_type NOT NULL,
  severity alert_severity NOT NULL,
  status alert_status DEFAULT 'active',
  title VARCHAR(500) NOT NULL,
  message TEXT NOT NULL,
  related_entity_id UUID,
  related_entity_type VARCHAR(50),
  threshold_value DECIMAL(10, 2),
  current_value DECIMAL(10, 2),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notification_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT true,
  email_address VARCHAR(255),
  alert_info BOOLEAN DEFAULT false,
  alert_warning BOOLEAN DEFAULT true,
  alert_critical BOOLEAN DEFAULT true,
  whatsapp_enabled BOOLEAN DEFAULT false,
  whatsapp_phone VARCHAR(50),
  whatsapp_alert_critical BOOLEAN DEFAULT true,
  whatsapp_alert_warning BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELAS DO SISTEMA
-- ============================================

CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  connection_id UUID REFERENCES connections(id),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELAS DO WHATSAPP
-- ============================================

CREATE TABLE whatsapp_groups (
  id VARCHAR(100) PRIMARY KEY,
  subject VARCHAR(255) NOT NULL,
  description TEXT,
  size INTEGER,
  owner VARCHAR(100),
  picture_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE whatsapp_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES support_tickets(id),
  phone_number VARCHAR(50) NOT NULL,
  message_content TEXT NOT NULL,
  message_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT,
  external_id VARCHAR(100),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(50) UNIQUE NOT NULL,
  state VARCHAR(50) NOT NULL,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE whatsapp_message_mapping (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  message_id VARCHAR(255) NOT NULL,
  group_id VARCHAR(100),
  phone_number VARCHAR(50),
  direction VARCHAR(20) DEFAULT 'inbound',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_name VARCHAR(100) NOT NULL,
  template_type VARCHAR(50) NOT NULL,
  template_content TEXT NOT NULL,
  variables TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- VIEWS
-- ============================================

CREATE VIEW v_connection_details AS
SELECT
  c.id,
  c.connection_code,
  c.cable_type,
  c.cable_color,
  c.cable_length_meters,
  c.status,
  c.vlan_id,
  c.vlan_name,
  c.vlan_tagging,
  c.installed_at,
  c.notes,
  c.port_a_id,
  pa.name as port_a_name,
  ea.id as equipment_a_id,
  ea.name as equipment_a_name,
  ea.type as equipment_a_type,
  ra.id as rack_a_id,
  ra.name as rack_a_name,
  c.port_b_id,
  pb.name as port_b_name,
  eb.id as equipment_b_id,
  eb.name as equipment_b_name,
  eb.type as equipment_b_type,
  rb.id as rack_b_id,
  rb.name as rack_b_name
FROM connections c
JOIN ports pa ON c.port_a_id = pa.id
JOIN equipment ea ON pa.equipment_id = ea.id
JOIN racks ra ON ea.rack_id = ra.id
JOIN ports pb ON c.port_b_id = pb.id
JOIN equipment eb ON pb.equipment_id = eb.id
JOIN racks rb ON eb.rack_id = rb.id;

CREATE VIEW v_port_availability AS
SELECT
  e.id as equipment_id,
  e.name as equipment_name,
  e.type as equipment_type,
  COUNT(p.id) as total_ports,
  COUNT(CASE WHEN p.status = 'available' THEN 1 END) as available_ports,
  COUNT(CASE WHEN p.status = 'in_use' THEN 1 END) as in_use_ports
FROM equipment e
LEFT JOIN ports p ON e.id = p.equipment_id
GROUP BY e.id, e.name, e.type;

-- ============================================
-- FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_connection_code()
RETURNS VARCHAR AS $$
DECLARE
  new_code VARCHAR;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'CON-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
    SELECT EXISTS(SELECT 1 FROM connections WHERE connection_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
  year_part VARCHAR;
  seq_num INTEGER;
  new_number VARCHAR;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 10) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM support_tickets
  WHERE ticket_number LIKE 'TKT-' || year_part || '-%';
  
  new_number := 'TKT-' || year_part || '-' || LPAD(seq_num::TEXT, 5, '0');
  NEW.ticket_number := new_number;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION has_role(_role user_role, _user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = _role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

-- Updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_buildings_updated_at BEFORE UPDATE ON buildings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_floors_updated_at BEFORE UPDATE ON floors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_racks_updated_at BEFORE UPDATE ON racks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ports_updated_at BEFORE UPDATE ON ports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_connections_updated_at BEFORE UPDATE ON connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rack_annotations_updated_at BEFORE UPDATE ON rack_annotations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_settings_updated_at BEFORE UPDATE ON notification_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_groups_updated_at BEFORE UPDATE ON whatsapp_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_sessions_updated_at BEFORE UPDATE ON whatsapp_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_templates_updated_at BEFORE UPDATE ON whatsapp_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Ticket number trigger
CREATE TRIGGER generate_ticket_number_trigger BEFORE INSERT ON support_tickets FOR EACH ROW EXECUTE FUNCTION generate_ticket_number();

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_profiles_phone ON profiles(phone);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

CREATE INDEX idx_floors_building_id ON floors(building_id);
CREATE INDEX idx_rooms_floor_id ON rooms(floor_id);
CREATE INDEX idx_racks_room_id ON racks(room_id);
CREATE INDEX idx_equipment_rack_id ON equipment(rack_id);
CREATE INDEX idx_equipment_type ON equipment(type);
CREATE INDEX idx_ports_equipment_id ON ports(equipment_id);
CREATE INDEX idx_ports_status ON ports(status);
CREATE INDEX idx_connections_port_a ON connections(port_a_id);
CREATE INDEX idx_connections_port_b ON connections(port_b_id);
CREATE INDEX idx_connections_status ON connections(status);
CREATE INDEX idx_labels_connection_id ON labels(connection_id);

CREATE INDEX idx_tickets_status ON support_tickets(status);
CREATE INDEX idx_tickets_priority ON support_tickets(priority);
CREATE INDEX idx_tickets_created_by ON support_tickets(created_by);
CREATE INDEX idx_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX idx_tickets_created_at ON support_tickets(created_at);
CREATE INDEX idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);

CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_type ON alerts(type);
CREATE INDEX idx_alerts_related_entity ON alerts(related_entity_id, related_entity_type);

CREATE INDEX idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX idx_access_logs_created_at ON access_logs(created_at);
CREATE INDEX idx_whatsapp_notifications_ticket_id ON whatsapp_notifications(ticket_id);
CREATE INDEX idx_whatsapp_sessions_phone ON whatsapp_sessions(phone);
CREATE INDEX idx_whatsapp_message_mapping_ticket_id ON whatsapp_message_mapping(ticket_id);

-- ============================================
-- DADOS INICIAIS
-- ============================================

-- Alert settings padrão
INSERT INTO alert_settings (setting_key, setting_value, description) VALUES
  ('rack_warning_threshold', 80, 'Threshold de aviso para ocupação de rack (%)'),
  ('rack_critical_threshold', 90, 'Threshold crítico para ocupação de rack (%)'),
  ('port_warning_threshold', 80, 'Threshold de aviso para uso de portas (%)'),
  ('port_critical_threshold', 90, 'Threshold crítico para uso de portas (%)'),
  ('poe_warning_threshold', 80, 'Threshold de aviso para uso de PoE (%)'),
  ('poe_critical_threshold', 90, 'Threshold crítico para uso de PoE (%)');

-- System settings padrão
INSERT INTO system_settings (setting_key, setting_value) VALUES
  ('theme', '{"primaryColor": "#3b82f6", "darkMode": false}'::jsonb),
  ('company_info', '{"name": "Data Center Management", "logo": null}'::jsonb);

-- WhatsApp templates padrão
INSERT INTO whatsapp_templates (template_name, template_type, template_content, variables) VALUES
  ('ticket_created', 'notification', 'Chamado #{{ticket_number}} criado: {{title}}', ARRAY['ticket_number', 'title']),
  ('ticket_resolved', 'notification', 'Chamado #{{ticket_number}} foi resolvido!', ARRAY['ticket_number']),
  ('ticket_assigned', 'notification', 'Chamado #{{ticket_number}} atribuído a {{technician}}', ARRAY['ticket_number', 'technician']);
