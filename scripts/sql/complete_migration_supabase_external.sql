-- ============================================================
-- MIGRAÇÃO COMPLETA - Supabase Externo
-- Gerado em: 2026-02-19 (ATUALIZADO)
-- Execute no SQL Editor do seu projeto Supabase externo
-- ============================================================
-- INSTRUÇÕES:
-- 1. Crie um novo projeto no supabase.com
-- 2. Acesse SQL Editor no dashboard do Supabase
-- 3. Cole e execute este script completo
-- 4. Configure os secrets nas Edge Functions
-- ============================================================

-- ============================================
-- EXTENSÕES
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUMS
-- ============================================

DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('admin', 'technician', 'viewer', 'network_viewer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.equipment_type AS ENUM (
    'switch', 'router', 'server', 'patch_panel', 'firewall', 'storage', 'other',
    'load_balancer', 'waf', 'access_point', 'pdu', 'ups', 'dvr', 'nvr',
    'pabx', 'voip_gateway', 'modem', 'olt', 'onu', 'kvm', 'console_server',
    'patch_panel_fiber', 'cable_organizer_horizontal', 'cable_organizer_vertical',
    'brush_panel', 'switch_poe', 'poe_injector', 'poe_splitter', 'pdu_smart',
    'ip_camera', 'media_converter', 'media_converter_chassis', 'environment_sensor',
    'rack_monitor', 'dslam', 'msan', 'fixed_shelf'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.equipment_status AS ENUM (
    'active', 'planned', 'offline', 'staged', 'failed', 'decommissioning'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.port_status AS ENUM ('available', 'in_use', 'reserved', 'disabled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.port_type AS ENUM (
    'rj45', 'sfp', 'sfp_plus', 'sfp28', 'qsfp', 'qsfp28', 'fiber_lc', 'fiber_sc',
    'bnc', 'hdmi', 'vga', 'usb', 'serial', 'console_rj45', 'console_usb',
    'fxo_fxs', 'e1_t1', 'power_ac', 'power_dc', 'antenna_sma', 'rs485_rs232',
    'io', 'other', 'rj45_poe', 'rj45_poe_plus', 'rj45_poe_plus_plus', 'sensor_io'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.cable_type AS ENUM (
    'utp_cat5e', 'utp_cat6', 'utp_cat6a', 'fiber_om3', 'fiber_om4', 'fiber_os2',
    'dac', 'other', 'coaxial_rg59', 'coaxial_rg6', 'utp_balun'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.connection_status AS ENUM ('active', 'inactive', 'reserved', 'testing', 'faulty');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.alert_type AS ENUM (
    'rack_capacity', 'port_capacity', 'equipment_failure', 'poe_capacity',
    'nvr_full', 'camera_unassigned', 'connection_faulty', 'connection_stale_testing',
    'equipment_no_ip', 'zabbix_alert', 'epi_alert'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.alert_severity AS ENUM ('info', 'warning', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.alert_status AS ENUM ('active', 'acknowledged', 'resolved');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- SEQUENCES
-- ============================================

CREATE SEQUENCE IF NOT EXISTS public.connection_code_seq START WITH 1 INCREMENT BY 1;

-- ============================================
-- TABELAS
-- ============================================

-- Profiles (referencia auth.users do Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  avatar_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID,
  UNIQUE(user_id, role)
);

-- Buildings
CREATE TABLE IF NOT EXISTS public.buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  building_type TEXT,
  internal_code TEXT,
  zip_code TEXT,
  city TEXT,
  state TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Floors
CREATE TABLE IF NOT EXISTS public.floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  floor_number INTEGER,
  area_sqm NUMERIC,
  has_access_control BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rooms
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  room_type TEXT,
  capacity INTEGER,
  has_access_control BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Racks
CREATE TABLE IF NOT EXISTS public.racks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size_u INTEGER NOT NULL DEFAULT 42,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Equipment
CREATE TABLE IF NOT EXISTS public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rack_id UUID NOT NULL REFERENCES racks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type equipment_type NOT NULL,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  hostname TEXT,
  ip_address TEXT,
  position_u_start INTEGER,
  position_u_end INTEGER,
  mount_side TEXT DEFAULT 'front',
  asset_tag TEXT,
  equipment_status TEXT DEFAULT 'active',
  airflow TEXT,
  weight_kg NUMERIC,
  power_consumption_watts INTEGER,
  primary_mac_address TEXT,
  poe_budget_watts NUMERIC,
  poe_power_per_port JSONB,
  zabbix_host_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ports
CREATE TABLE IF NOT EXISTS public.ports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  port_number INTEGER,
  port_type port_type DEFAULT 'rj45',
  status port_status NOT NULL DEFAULT 'available',
  speed TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(equipment_id, name)
);

-- VLANs
CREATE TABLE IF NOT EXISTS public.vlans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vlan_id INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'data',
  color TEXT DEFAULT '#3b82f6',
  building_id UUID REFERENCES buildings(id),
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Connections
CREATE TABLE IF NOT EXISTS public.connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_code TEXT NOT NULL UNIQUE,
  port_a_id UUID NOT NULL REFERENCES ports(id) ON DELETE CASCADE,
  port_b_id UUID NOT NULL REFERENCES ports(id) ON DELETE CASCADE,
  cable_type cable_type NOT NULL,
  cable_length_meters NUMERIC,
  cable_color TEXT,
  status connection_status NOT NULL DEFAULT 'active',
  vlan_id INTEGER,
  vlan_name TEXT,
  vlan_tagging TEXT DEFAULT 'untagged',
  vlan_uuid UUID REFERENCES vlans(id),
  installed_by UUID,
  installed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Labels
CREATE TABLE IF NOT EXISTS public.labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  qr_code_data TEXT NOT NULL,
  label_file_url TEXT,
  generated_by UUID,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  printed_at TIMESTAMPTZ,
  print_count INTEGER NOT NULL DEFAULT 0
);

-- Access Logs
CREATE TABLE IF NOT EXISTS public.access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  connection_id UUID REFERENCES connections(id),
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rack Annotations
CREATE TABLE IF NOT EXISTS public.rack_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rack_id UUID NOT NULL REFERENCES racks(id) ON DELETE CASCADE,
  position_u INTEGER NOT NULL,
  position_side TEXT DEFAULT 'front',
  title TEXT NOT NULL,
  description TEXT,
  annotation_type TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  color TEXT DEFAULT '#3b82f6',
  icon TEXT DEFAULT 'info',
  due_date TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rack Occupancy History
CREATE TABLE IF NOT EXISTS public.rack_occupancy_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rack_id UUID REFERENCES racks(id),
  equipment_id UUID REFERENCES equipment(id),
  equipment_name TEXT NOT NULL,
  action TEXT NOT NULL,
  position_u_start INTEGER NOT NULL,
  position_u_end INTEGER NOT NULL,
  mount_side TEXT DEFAULT 'front',
  previous_rack_id UUID REFERENCES racks(id),
  performed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Floor Plans
CREATE TABLE IF NOT EXISTS public.floor_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  original_width INTEGER,
  original_height INTEGER,
  is_active BOOLEAN DEFAULT true,
  uploaded_by UUID,
  scale_ratio INTEGER DEFAULT 100,
  pixels_per_cm NUMERIC DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Rack Positions (floor plan)
CREATE TABLE IF NOT EXISTS public.rack_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_plan_id UUID NOT NULL REFERENCES floor_plans(id) ON DELETE CASCADE,
  rack_id UUID NOT NULL REFERENCES racks(id),
  position_x NUMERIC NOT NULL,
  position_y NUMERIC NOT NULL,
  rotation INTEGER DEFAULT 0,
  width NUMERIC DEFAULT 60,
  height NUMERIC DEFAULT 100,
  icon_style TEXT DEFAULT 'default',
  icon_size TEXT DEFAULT 'medium',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(floor_plan_id, rack_id)
);

-- Equipment Positions (floor plan)
CREATE TABLE IF NOT EXISTS public.equipment_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_plan_id UUID NOT NULL REFERENCES floor_plans(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  position_x NUMERIC NOT NULL,
  position_y NUMERIC NOT NULL,
  rotation INTEGER DEFAULT 0,
  icon_size TEXT DEFAULT 'medium',
  custom_label TEXT,
  custom_icon TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(floor_plan_id, equipment_id)
);

-- Floor Plan Measurements
CREATE TABLE IF NOT EXISTS public.floor_plan_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_plan_id UUID NOT NULL REFERENCES floor_plans(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  description TEXT,
  points JSONB NOT NULL,
  scale NUMERIC NOT NULL DEFAULT 100,
  is_closed BOOLEAN DEFAULT false,
  total_distance NUMERIC,
  area NUMERIC,
  color VARCHAR DEFAULT '#ef4444',
  category VARCHAR DEFAULT 'geral',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Subnets
CREATE TABLE IF NOT EXISTS public.subnets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  cidr TEXT NOT NULL UNIQUE,
  network_address TEXT NOT NULL,
  prefix_length INTEGER NOT NULL,
  total_addresses BIGINT NOT NULL,
  usable_addresses BIGINT NOT NULL,
  gateway_ip TEXT,
  gateway_name TEXT,
  broadcast_address TEXT,
  ip_version TEXT NOT NULL DEFAULT 'ipv4',
  vlan_id INTEGER,
  vlan_uuid UUID REFERENCES vlans(id),
  building_id UUID REFERENCES buildings(id),
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- IP Addresses
CREATE TABLE IF NOT EXISTS public.ip_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subnet_id UUID NOT NULL REFERENCES subnets(id) ON DELETE CASCADE,
  ip_address TEXT NOT NULL,
  name TEXT,
  ip_type TEXT NOT NULL DEFAULT 'host',
  status TEXT NOT NULL DEFAULT 'available',
  equipment_id UUID REFERENCES equipment(id),
  notes TEXT,
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(subnet_id, ip_address)
);

-- Support Tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  created_by UUID NOT NULL,
  assigned_to UUID,
  contact_phone TEXT,
  technician_phone TEXT,
  related_building_id UUID REFERENCES buildings(id),
  related_room_id UUID REFERENCES rooms(id),
  related_rack_id UUID REFERENCES racks(id),
  related_equipment_id UUID REFERENCES equipment(id),
  due_date TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ticket Comments
CREATE TABLE IF NOT EXISTS public.ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  source TEXT DEFAULT 'web',
  whatsapp_sender_name TEXT,
  whatsapp_sender_phone TEXT,
  attachments JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ticket Deadline Notifications
CREATE TABLE IF NOT EXISTS public.ticket_deadline_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  old_priority TEXT,
  new_priority TEXT,
  notified_users JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Alerts
CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type alert_type NOT NULL,
  severity alert_severity NOT NULL,
  status alert_status DEFAULT 'active',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_entity_id UUID,
  related_entity_type TEXT,
  threshold_value NUMERIC,
  current_value NUMERIC,
  metadata JSONB,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Alert Settings
CREATE TABLE IF NOT EXISTS public.alert_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value NUMERIC NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID
);

-- Notification Settings
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  email_address TEXT,
  alert_critical BOOLEAN NOT NULL DEFAULT true,
  alert_warning BOOLEAN NOT NULL DEFAULT true,
  alert_info BOOLEAN NOT NULL DEFAULT false,
  whatsapp_enabled BOOLEAN DEFAULT false,
  whatsapp_phone TEXT,
  whatsapp_alert_critical BOOLEAN DEFAULT true,
  whatsapp_alert_warning BOOLEAN DEFAULT false,
  whatsapp_alert_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- System Settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  updated_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- System Knowledge (AI Chat)
CREATE TABLE IF NOT EXISTS public.system_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  keywords TEXT[],
  version INTEGER DEFAULT 1,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Chat Messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_id UUID NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Monitoring Panels
CREATE TABLE IF NOT EXISTS public.monitoring_panels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  panel_type TEXT NOT NULL DEFAULT 'grafana',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Landing Content
CREATE TABLE IF NOT EXISTS public.landing_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  title TEXT,
  description TEXT,
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Landing Screenshots
CREATE TABLE IF NOT EXISTS public.landing_screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- WhatsApp Groups
CREATE TABLE IF NOT EXISTS public.whatsapp_groups (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  description TEXT,
  size INTEGER DEFAULT 0,
  owner TEXT,
  picture_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- WhatsApp Notifications
CREATE TABLE IF NOT EXISTS public.whatsapp_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES support_tickets(id),
  phone_number TEXT NOT NULL,
  message_content TEXT NOT NULL,
  message_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  external_id TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- WhatsApp Sessions
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- WhatsApp Message Mapping
CREATE TABLE IF NOT EXISTS public.whatsapp_message_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,
  group_id TEXT,
  phone_number TEXT,
  direction TEXT DEFAULT 'outbound',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- WhatsApp Templates
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL UNIQUE,
  template_content TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- WhatsApp Interactions
CREATE TABLE IF NOT EXISTS public.whatsapp_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  message_received TEXT NOT NULL,
  command TEXT,
  args TEXT,
  response_sent TEXT,
  response_status TEXT DEFAULT 'success',
  processing_time_ms INTEGER,
  is_group BOOLEAN DEFAULT false,
  group_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- VIEWS
-- ============================================

CREATE OR REPLACE VIEW public.v_connection_details AS
SELECT
  c.id,
  c.connection_code,
  c.cable_type,
  c.cable_length_meters,
  c.cable_color,
  c.status,
  c.installed_at,
  c.notes,
  c.vlan_id,
  c.vlan_name,
  c.vlan_tagging,
  c.port_a_id,
  c.port_b_id,
  pa.name AS port_a_name,
  pb.name AS port_b_name,
  ea.id AS equipment_a_id,
  ea.name AS equipment_a_name,
  ea.type AS equipment_a_type,
  eb.id AS equipment_b_id,
  eb.name AS equipment_b_name,
  eb.type AS equipment_b_type,
  ra.id AS rack_a_id,
  ra.name AS rack_a_name,
  rb.id AS rack_b_id,
  rb.name AS rack_b_name
FROM connections c
  LEFT JOIN ports pa ON c.port_a_id = pa.id
  LEFT JOIN ports pb ON c.port_b_id = pb.id
  LEFT JOIN equipment ea ON pa.equipment_id = ea.id
  LEFT JOIN equipment eb ON pb.equipment_id = eb.id
  LEFT JOIN racks ra ON ea.rack_id = ra.id
  LEFT JOIN racks rb ON eb.rack_id = rb.id;

CREATE OR REPLACE VIEW public.v_port_availability AS
SELECT
  e.id AS equipment_id,
  e.name AS equipment_name,
  e.type AS equipment_type,
  COUNT(p.id) AS total_ports,
  COUNT(CASE WHEN p.status = 'available' THEN 1 END) AS available_ports,
  COUNT(CASE WHEN p.status = 'in_use' THEN 1 END) AS in_use_ports
FROM equipment e
  LEFT JOIN ports p ON e.id = p.equipment_id
GROUP BY e.id, e.name, e.type;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Handle new user (auto-create profile)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', '')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Generate connection code
CREATE OR REPLACE FUNCTION public.generate_connection_code()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  code TEXT;
BEGIN
  next_num := nextval('public.connection_code_seq');
  code := 'C-' || LPAD(next_num::TEXT, 5, '0');
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Set connection code trigger function
CREATE OR REPLACE FUNCTION public.set_connection_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.connection_code IS NULL THEN
    NEW.connection_code := public.generate_connection_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Generate ticket number
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
  year_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO year_count 
  FROM public.support_tickets 
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
  
  NEW.ticket_number := 'TKT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(year_count::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Has role (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Update alert settings updated_at
CREATE OR REPLACE FUNCTION public.update_alert_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Log equipment install
CREATE OR REPLACE FUNCTION public.log_equipment_install()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rack_id IS NOT NULL AND NEW.position_u_start IS NOT NULL THEN
    INSERT INTO public.rack_occupancy_history (
      rack_id, equipment_id, equipment_name, action,
      position_u_start, position_u_end, mount_side
    ) VALUES (
      NEW.rack_id, NEW.id, NEW.name, 'installed',
      NEW.position_u_start, COALESCE(NEW.position_u_end, NEW.position_u_start), 
      COALESCE(NEW.mount_side, 'front')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log equipment change
CREATE OR REPLACE FUNCTION public.log_equipment_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.rack_id IS NOT NULL AND (NEW.rack_id IS NULL OR NEW.rack_id != OLD.rack_id) THEN
    INSERT INTO public.rack_occupancy_history (
      rack_id, equipment_id, equipment_name, action,
      position_u_start, position_u_end, mount_side
    ) VALUES (
      OLD.rack_id, OLD.id, OLD.name, 'removed',
      OLD.position_u_start, COALESCE(OLD.position_u_end, OLD.position_u_start), 
      COALESCE(OLD.mount_side, 'front')
    );
  END IF;
  
  IF NEW.rack_id IS NOT NULL AND NEW.position_u_start IS NOT NULL AND 
     (OLD.rack_id IS NULL OR NEW.rack_id != OLD.rack_id OR 
      OLD.position_u_start IS DISTINCT FROM NEW.position_u_start) THEN
    INSERT INTO public.rack_occupancy_history (
      rack_id, equipment_id, equipment_name, action,
      position_u_start, position_u_end, mount_side, previous_rack_id
    ) VALUES (
      NEW.rack_id, NEW.id, NEW.name, 
      CASE WHEN OLD.rack_id IS NOT NULL AND OLD.rack_id != NEW.rack_id THEN 'moved' ELSE 'installed' END,
      NEW.position_u_start, COALESCE(NEW.position_u_end, NEW.position_u_start), 
      COALESCE(NEW.mount_side, 'front'),
      CASE WHEN OLD.rack_id != NEW.rack_id THEN OLD.rack_id ELSE NULL END
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup old monitoring data
CREATE OR REPLACE FUNCTION public.cleanup_old_monitoring_data()
RETURNS VOID AS $$
BEGIN
  -- Tabelas opcionais de monitoramento - ignorar se não existirem
  BEGIN
    DELETE FROM snmp_metrics WHERE collected_at < now() - interval '30 days';
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  BEGIN
    DELETE FROM device_uptime_history WHERE collected_at < now() - interval '90 days';
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  BEGIN
    DELETE FROM sync_logs WHERE started_at < now() - interval '7 days';
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-create profile on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_buildings_updated_at ON buildings;
CREATE TRIGGER update_buildings_updated_at BEFORE UPDATE ON buildings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_floors_updated_at ON floors;
CREATE TRIGGER update_floors_updated_at BEFORE UPDATE ON floors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rooms_updated_at ON rooms;
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_racks_updated_at ON racks;
CREATE TRIGGER update_racks_updated_at BEFORE UPDATE ON racks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_equipment_updated_at ON equipment;
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ports_updated_at ON ports;
CREATE TRIGGER update_ports_updated_at BEFORE UPDATE ON ports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_connections_updated_at ON connections;
CREATE TRIGGER update_connections_updated_at BEFORE UPDATE ON connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON support_tickets;
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rack_annotations_updated_at ON rack_annotations;
CREATE TRIGGER update_rack_annotations_updated_at BEFORE UPDATE ON rack_annotations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_settings_updated_at ON notification_settings;
CREATE TRIGGER update_notification_settings_updated_at BEFORE UPDATE ON notification_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_alert_settings_updated_at ON alert_settings;
CREATE TRIGGER update_alert_settings_updated_at BEFORE UPDATE ON alert_settings FOR EACH ROW EXECUTE FUNCTION update_alert_settings_updated_at();

-- Connection code trigger
DROP TRIGGER IF EXISTS set_connection_code_trigger ON connections;
CREATE TRIGGER set_connection_code_trigger BEFORE INSERT ON connections FOR EACH ROW EXECUTE FUNCTION set_connection_code();

-- Ticket number trigger
DROP TRIGGER IF EXISTS generate_ticket_number_trigger ON support_tickets;
CREATE TRIGGER generate_ticket_number_trigger BEFORE INSERT ON support_tickets FOR EACH ROW EXECUTE FUNCTION generate_ticket_number();

-- Equipment history triggers
DROP TRIGGER IF EXISTS log_equipment_install_trigger ON equipment;
CREATE TRIGGER log_equipment_install_trigger AFTER INSERT ON equipment FOR EACH ROW EXECUTE FUNCTION log_equipment_install();

DROP TRIGGER IF EXISTS log_equipment_change_trigger ON equipment;
CREATE TRIGGER log_equipment_change_trigger AFTER UPDATE ON equipment FOR EACH ROW EXECUTE FUNCTION log_equipment_change();

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_access_logs_user ON access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_connection ON access_logs(connection_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_buildings_type ON buildings(building_type);
CREATE INDEX IF NOT EXISTS idx_buildings_city ON buildings(city);
CREATE INDEX IF NOT EXISTS idx_buildings_state ON buildings(state);
CREATE INDEX IF NOT EXISTS idx_buildings_internal_code ON buildings(internal_code);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_connections_code ON connections(connection_code);
CREATE INDEX IF NOT EXISTS idx_connections_ports ON connections(port_a_id, port_b_id);
CREATE INDEX IF NOT EXISTS idx_connections_vlan_id ON connections(vlan_id);
CREATE INDEX IF NOT EXISTS idx_connections_vlan_uuid ON connections(vlan_uuid);
CREATE INDEX IF NOT EXISTS idx_equipment_rack ON equipment(rack_id);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(equipment_status);
CREATE INDEX IF NOT EXISTS idx_equipment_mount_side ON equipment(mount_side);
CREATE INDEX IF NOT EXISTS idx_equipment_asset_tag ON equipment(asset_tag) WHERE asset_tag IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_floors_building ON floors(building_id);
CREATE INDEX IF NOT EXISTS idx_floors_access_control ON floors(has_access_control);
CREATE INDEX IF NOT EXISTS idx_floor_plan_measurements_floor_plan_id ON floor_plan_measurements(floor_plan_id);
CREATE INDEX IF NOT EXISTS idx_floor_plan_measurements_category ON floor_plan_measurements(floor_plan_id, category);
CREATE INDEX IF NOT EXISTS idx_ip_addresses_subnet ON ip_addresses(subnet_id);
CREATE INDEX IF NOT EXISTS idx_ip_addresses_ip ON ip_addresses(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_addresses_status ON ip_addresses(status);
CREATE INDEX IF NOT EXISTS idx_ip_addresses_equipment ON ip_addresses(equipment_id);
CREATE INDEX IF NOT EXISTS idx_ip_addresses_name ON ip_addresses(name) WHERE name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_labels_connection ON labels(connection_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON system_knowledge(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_keywords ON system_knowledge USING gin(keywords);
CREATE INDEX IF NOT EXISTS idx_ports_equipment ON ports(equipment_id);
CREATE INDEX IF NOT EXISTS idx_ports_port_type ON ports(port_type);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
CREATE INDEX IF NOT EXISTS idx_rack_annotations_rack_id ON rack_annotations(rack_id);
CREATE INDEX IF NOT EXISTS idx_rack_annotations_due_date ON rack_annotations(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rack_history_rack ON rack_occupancy_history(rack_id);
CREATE INDEX IF NOT EXISTS idx_rack_history_equipment ON rack_occupancy_history(equipment_id);
CREATE INDEX IF NOT EXISTS idx_rack_history_date ON rack_occupancy_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rack_positions_floor_plan ON rack_positions(floor_plan_id);
CREATE INDEX IF NOT EXISTS idx_rack_positions_rack ON rack_positions(rack_id);
CREATE INDEX IF NOT EXISTS idx_racks_room ON racks(room_id);
CREATE INDEX IF NOT EXISTS idx_rooms_floor ON rooms(floor_id);
CREATE INDEX IF NOT EXISTS idx_rooms_type ON rooms(room_type);
CREATE INDEX IF NOT EXISTS idx_rooms_access_control ON rooms(has_access_control);
CREATE INDEX IF NOT EXISTS idx_subnets_cidr ON subnets(cidr);
CREATE INDEX IF NOT EXISTS idx_subnets_vlan_uuid ON subnets(vlan_uuid);
CREATE INDEX IF NOT EXISTS idx_subnets_building ON subnets(building_id);
CREATE INDEX IF NOT EXISTS idx_ticket_deadline_notifications_ticket_id ON ticket_deadline_notifications(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_deadline_notifications_type ON ticket_deadline_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_ticket_deadline_notifications_created_at ON ticket_deadline_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_vlans_vlan_id ON vlans(vlan_id);
CREATE INDEX IF NOT EXISTS idx_vlans_building_id ON vlans(building_id);
CREATE INDEX IF NOT EXISTS idx_vlans_category ON vlans(category);
CREATE INDEX IF NOT EXISTS idx_whatsapp_interactions_phone ON whatsapp_interactions(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_interactions_command ON whatsapp_interactions(command);
CREATE INDEX IF NOT EXISTS idx_whatsapp_interactions_created ON whatsapp_interactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_message_mapping_ticket_id ON whatsapp_message_mapping(ticket_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_message_mapping_message_id ON whatsapp_message_mapping(message_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_updated_at ON whatsapp_sessions(updated_at);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE racks ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE ports ENABLE ROW LEVEL SECURITY;
ALTER TABLE vlans ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rack_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rack_occupancy_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE rack_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE floor_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE floor_plan_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE subnets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_deadline_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_message_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_interactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- profiles
CREATE POLICY "Anyone can view profiles" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- user_roles
CREATE POLICY "Anyone can view their own roles" ON user_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can view all roles" ON user_roles FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can manage roles" ON user_roles FOR ALL USING (has_role(auth.uid(), 'admin'));

-- buildings
CREATE POLICY "Anyone authenticated can view buildings" ON buildings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can insert buildings" ON buildings FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can update buildings" ON buildings FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can delete buildings" ON buildings FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- floors
CREATE POLICY "Anyone authenticated can view floors" ON floors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can manage floors" ON floors FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- rooms
CREATE POLICY "Anyone authenticated can view rooms" ON rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can manage rooms" ON rooms FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- racks
CREATE POLICY "Anyone authenticated can view racks" ON racks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can manage racks" ON racks FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- equipment
CREATE POLICY "Anyone authenticated can view equipment" ON equipment FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and technicians can manage equipment" ON equipment FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'technician'));

-- ports
CREATE POLICY "Anyone authenticated can view ports" ON ports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and technicians can manage ports" ON ports FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'technician'));

-- vlans
CREATE POLICY "Anyone authenticated can view vlans" ON vlans FOR SELECT USING (true);
CREATE POLICY "Admins and technicians can manage vlans" ON vlans FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'technician'));

-- connections
CREATE POLICY "Anyone authenticated can view connections" ON connections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and technicians can manage connections" ON connections FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'technician'));
CREATE POLICY "Viewers can view connections they scanned" ON connections FOR SELECT TO authenticated USING (has_role(auth.uid(), 'viewer') AND id IN (SELECT connection_id FROM access_logs WHERE user_id = auth.uid() AND action = 'qr_scanned'));
CREATE POLICY "Network viewers can view connections they scanned" ON connections FOR SELECT USING (has_role(auth.uid(), 'network_viewer') AND id IN (SELECT connection_id FROM access_logs WHERE user_id = auth.uid() AND action = 'qr_scanned'));

-- labels
CREATE POLICY "Anyone authenticated can view labels" ON labels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and technicians can manage labels" ON labels FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'technician'));

-- access_logs
CREATE POLICY "Admins can view all logs" ON access_logs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view their own logs" ON access_logs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Anyone authenticated can insert logs" ON access_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Viewers can insert their own scan logs" ON access_logs FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'viewer') AND user_id = auth.uid());
CREATE POLICY "Viewers can view their own scan logs" ON access_logs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'viewer') AND user_id = auth.uid() AND action = 'qr_scanned');
CREATE POLICY "Network viewers can view their own scan logs" ON access_logs FOR SELECT USING (has_role(auth.uid(), 'network_viewer') AND user_id = auth.uid() AND action = 'qr_scanned');

-- rack_annotations
CREATE POLICY "Anyone authenticated can view annotations" ON rack_annotations FOR SELECT USING (true);
CREATE POLICY "Admins and technicians can manage annotations" ON rack_annotations FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'technician'));

-- rack_occupancy_history
CREATE POLICY "Anyone authenticated can view rack history" ON rack_occupancy_history FOR SELECT USING (true);
CREATE POLICY "System can insert rack history" ON rack_occupancy_history FOR INSERT WITH CHECK (true);

-- rack_positions
CREATE POLICY "Anyone authenticated can view rack positions" ON rack_positions FOR SELECT USING (true);
CREATE POLICY "Admins and technicians can manage rack positions" ON rack_positions FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'technician'));

-- floor_plans
CREATE POLICY "Anyone authenticated can view floor plans" ON floor_plans FOR SELECT USING (true);
CREATE POLICY "Admins and technicians can manage floor plans" ON floor_plans FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'technician'));

-- equipment_positions
CREATE POLICY "Anyone authenticated can view equipment positions" ON equipment_positions FOR SELECT USING (true);
CREATE POLICY "Admins and technicians can manage equipment positions" ON equipment_positions FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'technician'));

-- floor_plan_measurements
CREATE POLICY "Anyone authenticated can view measurements" ON floor_plan_measurements FOR SELECT USING (true);
CREATE POLICY "Admins and technicians can manage measurements" ON floor_plan_measurements FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'technician'));

-- subnets
CREATE POLICY "Anyone authenticated can view subnets" ON subnets FOR SELECT USING (true);
CREATE POLICY "Admins and technicians can manage subnets" ON subnets FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'technician'));

-- ip_addresses
CREATE POLICY "Anyone authenticated can view ip_addresses" ON ip_addresses FOR SELECT USING (true);
CREATE POLICY "Admins and technicians can manage ip_addresses" ON ip_addresses FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'technician'));

-- support_tickets
CREATE POLICY "Users can view tickets" ON support_tickets FOR SELECT TO authenticated USING (created_by = auth.uid() OR assigned_to = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'technician'));
CREATE POLICY "Authenticated users can create tickets" ON support_tickets FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Admins and technicians can update tickets" ON support_tickets FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'technician') OR created_by = auth.uid());
CREATE POLICY "Admins can delete tickets" ON support_tickets FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- ticket_comments
CREATE POLICY "Users can view comments on visible tickets" ON ticket_comments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM support_tickets st WHERE st.id = ticket_comments.ticket_id AND (st.created_by = auth.uid() OR st.assigned_to = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'technician'))));
CREATE POLICY "Authenticated users can add comments" ON ticket_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete their own comments" ON ticket_comments FOR DELETE TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

-- ticket_deadline_notifications
CREATE POLICY "Admins and technicians can view deadline notifications" ON ticket_deadline_notifications FOR SELECT USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('admin', 'technician')));
CREATE POLICY "System can insert deadline notifications" ON ticket_deadline_notifications FOR INSERT WITH CHECK (true);

-- alerts
CREATE POLICY "Anyone authenticated can view alerts" ON alerts FOR SELECT USING (true);
CREATE POLICY "System can insert alerts" ON alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins and technicians can manage alerts" ON alerts FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'technician'));

-- alert_settings
CREATE POLICY "Anyone authenticated can view alert settings" ON alert_settings FOR SELECT USING (true);
CREATE POLICY "Only admins can manage alert settings" ON alert_settings FOR ALL USING (has_role(auth.uid(), 'admin'));

-- notification_settings
CREATE POLICY "Users can view their own notification settings" ON notification_settings FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all notification settings" ON notification_settings FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert their own notification settings" ON notification_settings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own notification settings" ON notification_settings FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- system_settings
CREATE POLICY "Admins can view system settings" ON system_settings FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage system settings" ON system_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- system_knowledge
CREATE POLICY "Authenticated users can read knowledge" ON system_knowledge FOR SELECT USING (true);
CREATE POLICY "Admins can manage knowledge" ON system_knowledge FOR ALL USING (has_role(auth.uid(), 'admin'));

-- chat_messages
CREATE POLICY "Users can read own chat history" ON chat_messages FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own messages" ON chat_messages FOR INSERT WITH CHECK (user_id = auth.uid());

-- monitoring_panels
CREATE POLICY "Authenticated users can view monitoring panels" ON monitoring_panels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert monitoring panels" ON monitoring_panels FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));
CREATE POLICY "Admins can update monitoring panels" ON monitoring_panels FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));
CREATE POLICY "Admins can delete monitoring panels" ON monitoring_panels FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

-- landing_content
CREATE POLICY "Leitura pública de landing_content" ON landing_content FOR SELECT USING (true);
CREATE POLICY "Admins podem gerenciar landing_content" ON landing_content FOR ALL USING (has_role(auth.uid(), 'admin'));

-- landing_screenshots
CREATE POLICY "Leitura pública de screenshots" ON landing_screenshots FOR SELECT USING (true);
CREATE POLICY "Admins podem inserir screenshots" ON landing_screenshots FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins podem atualizar screenshots" ON landing_screenshots FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins podem deletar screenshots" ON landing_screenshots FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- whatsapp_groups
CREATE POLICY "Authenticated users can read whatsapp groups" ON whatsapp_groups FOR SELECT USING (true);
CREATE POLICY "Admins and technicians can manage whatsapp groups" ON whatsapp_groups FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'technician'));

-- whatsapp_notifications
CREATE POLICY "Admins can view whatsapp notifications" ON whatsapp_notifications FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'technician'));
CREATE POLICY "System can insert whatsapp notifications" ON whatsapp_notifications FOR INSERT WITH CHECK (true);

-- whatsapp_sessions
CREATE POLICY "Service role can manage sessions" ON whatsapp_sessions FOR ALL USING (true) WITH CHECK (true);

-- whatsapp_message_mapping
CREATE POLICY "Authenticated users can view mappings" ON whatsapp_message_mapping FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert mappings" ON whatsapp_message_mapping FOR INSERT WITH CHECK (true);

-- whatsapp_templates
CREATE POLICY "Anyone authenticated can view templates" ON whatsapp_templates FOR SELECT USING (true);
CREATE POLICY "Admins can manage templates" ON whatsapp_templates FOR ALL USING (has_role(auth.uid(), 'admin'));

-- whatsapp_interactions
CREATE POLICY "Admins e técnicos podem ver interações" ON whatsapp_interactions FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'technician'));
CREATE POLICY "Sistema pode inserir interações" ON whatsapp_interactions FOR INSERT WITH CHECK (true);

-- ============================================
-- STORAGE BUCKETS
-- ============================================

INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('floor-plans', 'floor-plans', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('landing-assets', 'landing-assets', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('public', 'public', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Auth users upload avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Auth users update avatars" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars');
CREATE POLICY "Auth users delete avatars" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars');

CREATE POLICY "Public read floor-plans" ON storage.objects FOR SELECT USING (bucket_id = 'floor-plans');
CREATE POLICY "Auth users upload floor-plans" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'floor-plans');
CREATE POLICY "Auth users update floor-plans" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'floor-plans');
CREATE POLICY "Auth users delete floor-plans" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'floor-plans');

CREATE POLICY "Public read landing-assets" ON storage.objects FOR SELECT USING (bucket_id = 'landing-assets');
CREATE POLICY "Admin upload landing-assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'landing-assets');

CREATE POLICY "Public read public bucket" ON storage.objects FOR SELECT USING (bucket_id = 'public');
CREATE POLICY "Auth users upload public" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'public');
CREATE POLICY "Auth users update public" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'public');
CREATE POLICY "Auth users delete public" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'public');

-- ============================================
-- REALTIME
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;

-- ============================================
-- DADOS INICIAIS
-- ============================================

INSERT INTO alert_settings (setting_key, setting_value, description) VALUES
  ('rack_warning_threshold', 80, 'Threshold de aviso para ocupação de rack (%)'),
  ('rack_critical_threshold', 90, 'Threshold crítico para ocupação de rack (%)'),
  ('port_warning_threshold', 80, 'Threshold de aviso para uso de portas (%)'),
  ('port_critical_threshold', 90, 'Threshold crítico para uso de portas (%)'),
  ('poe_warning_threshold', 80, 'Threshold de aviso para uso de PoE (%)'),
  ('poe_critical_threshold', 90, 'Threshold crítico para uso de PoE (%)')
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO system_settings (setting_key, setting_value) VALUES
  ('theme', '{"primaryColor": "#3b82f6", "darkMode": false}'::jsonb),
  ('company_info', '{"name": "Data Center Management", "logo": null}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO whatsapp_templates (template_name, template_type, template_content, variables) VALUES
  ('ticket_created', 'notification', 'Chamado #{{ticket_number}} criado: {{title}}', ARRAY['ticket_number', 'title']),
  ('ticket_resolved', 'resolved', 'Chamado #{{ticket_number}} foi resolvido!', ARRAY['ticket_number']),
  ('ticket_assigned', 'assigned', 'Chamado #{{ticket_number}} atribuído a {{technician}}', ARRAY['ticket_number', 'technician'])
ON CONFLICT (template_type) DO NOTHING;

-- ============================================
-- FIM DA MIGRAÇÃO
-- ============================================
