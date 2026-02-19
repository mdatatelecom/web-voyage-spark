-- ============================================================
-- MIGRAÇÃO COMPLETA - Supabase Externo
-- Gerado em: 2026-02-19
-- Execute no SQL Editor do seu projeto Supabase externo
-- ============================================================

-- ============================================================
-- 1. ENUMS
-- ============================================================

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
  CREATE TYPE public.port_type AS ENUM ('rj45', 'sfp', 'sfp_plus', 'qsfp', 'console', 'usb', 'fiber_lc', 'fiber_sc', 'fiber_st', 'fiber_mpo', 'bnc', 'f_connector');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.port_status AS ENUM ('available', 'in_use', 'reserved', 'disabled', 'faulty');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.cable_type AS ENUM ('utp_cat5e', 'utp_cat6', 'utp_cat6a', 'fiber_om3', 'fiber_om4', 'fiber_os2', 'dac', 'other', 'coaxial_rg59', 'coaxial_rg6', 'utp_balun');
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

-- ============================================================
-- 2. SEQUENCES
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS public.connection_code_seq START WITH 1 INCREMENT BY 1;

-- ============================================================
-- 3. FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_connection_code()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  next_num INTEGER;
  code TEXT;
BEGIN
  next_num := nextval('public.connection_code_seq');
  code := 'C-' || LPAD(next_num::TEXT, 5, '0');
  RETURN code;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_connection_code()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.connection_code IS NULL THEN
    NEW.connection_code := public.generate_connection_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE
  year_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO year_count 
  FROM public.support_tickets 
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
  NEW.ticket_number := 'TKT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(year_count::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', ''));
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_equipment_install()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.log_equipment_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.update_alert_settings_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 4. TABLES
-- ============================================================

-- profiles (references auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  phone text,
  avatar_updated_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  assigned_by uuid,
  UNIQUE(user_id, role)
);

-- buildings
CREATE TABLE IF NOT EXISTS public.buildings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  address text,
  building_type text,
  internal_code text,
  zip_code text,
  city text,
  state text,
  latitude numeric,
  longitude numeric,
  contact_name text,
  contact_phone text,
  contact_email text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- floors
CREATE TABLE IF NOT EXISTS public.floors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  name text NOT NULL,
  floor_number integer,
  area_sqm numeric,
  has_access_control boolean DEFAULT false,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- rooms
CREATE TABLE IF NOT EXISTS public.rooms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  floor_id uuid NOT NULL REFERENCES public.floors(id) ON DELETE CASCADE,
  name text NOT NULL,
  room_type text,
  capacity integer,
  has_access_control boolean DEFAULT false,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- racks
CREATE TABLE IF NOT EXISTS public.racks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  name text NOT NULL,
  size_u integer NOT NULL DEFAULT 42,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- equipment
CREATE TABLE IF NOT EXISTS public.equipment (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rack_id uuid NOT NULL REFERENCES public.racks(id) ON DELETE CASCADE,
  name text NOT NULL,
  type equipment_type NOT NULL,
  manufacturer text,
  model text,
  serial_number text,
  hostname text,
  ip_address text,
  position_u_start integer,
  position_u_end integer,
  notes text,
  mount_side text DEFAULT 'front',
  asset_tag text,
  equipment_status text DEFAULT 'active',
  airflow text,
  weight_kg numeric,
  power_consumption_watts integer,
  primary_mac_address text,
  poe_budget_watts numeric,
  poe_power_per_port jsonb,
  zabbix_host_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ports
CREATE TABLE IF NOT EXISTS public.ports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  name text NOT NULL,
  port_number integer,
  port_type port_type DEFAULT 'rj45',
  status port_status NOT NULL DEFAULT 'available',
  speed text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(equipment_id, name)
);

-- connections
CREATE TABLE IF NOT EXISTS public.connections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_code text NOT NULL UNIQUE,
  port_a_id uuid NOT NULL REFERENCES public.ports(id),
  port_b_id uuid NOT NULL REFERENCES public.ports(id),
  cable_type cable_type NOT NULL,
  cable_length_meters numeric,
  cable_color text,
  status connection_status NOT NULL DEFAULT 'active',
  notes text,
  installed_by uuid,
  installed_at timestamp with time zone NOT NULL DEFAULT now(),
  vlan_id integer,
  vlan_name text,
  vlan_tagging text DEFAULT 'untagged',
  vlan_uuid uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- labels
CREATE TABLE IF NOT EXISTS public.labels (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id uuid NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  qr_code_data text NOT NULL,
  label_file_url text,
  generated_by uuid,
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  printed_at timestamp with time zone,
  print_count integer NOT NULL DEFAULT 0
);

-- alerts
CREATE TABLE IF NOT EXISTS public.alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type alert_type NOT NULL,
  severity alert_severity NOT NULL,
  status alert_status DEFAULT 'active',
  title text NOT NULL,
  message text NOT NULL,
  related_entity_id uuid,
  related_entity_type text,
  threshold_value numeric,
  current_value numeric,
  metadata jsonb,
  acknowledged_at timestamp with time zone,
  acknowledged_by uuid,
  resolved_at timestamp with time zone,
  resolved_by uuid,
  created_at timestamp with time zone DEFAULT now()
);

-- alert_settings
CREATE TABLE IF NOT EXISTS public.alert_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text NOT NULL UNIQUE,
  setting_value numeric NOT NULL,
  description text,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid
);

-- access_logs
CREATE TABLE IF NOT EXISTS public.access_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  connection_id uuid REFERENCES public.connections(id),
  action text NOT NULL,
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- notification_settings
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  email_enabled boolean NOT NULL DEFAULT true,
  alert_critical boolean NOT NULL DEFAULT true,
  alert_warning boolean NOT NULL DEFAULT true,
  alert_info boolean NOT NULL DEFAULT false,
  email_address text,
  whatsapp_enabled boolean DEFAULT false,
  whatsapp_phone text,
  whatsapp_alert_critical boolean DEFAULT true,
  whatsapp_alert_warning boolean DEFAULT false,
  whatsapp_alert_resolved boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- support_tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  related_equipment_id uuid,
  related_rack_id uuid,
  related_room_id uuid,
  related_building_id uuid,
  created_by uuid NOT NULL,
  assigned_to uuid,
  contact_phone text,
  technician_phone text,
  attachments jsonb DEFAULT '[]'::jsonb,
  due_date timestamp with time zone,
  resolved_at timestamp with time zone,
  closed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ticket_comments
CREATE TABLE IF NOT EXISTS public.ticket_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  comment text NOT NULL,
  is_internal boolean DEFAULT false,
  attachments jsonb DEFAULT '[]'::jsonb,
  source text DEFAULT 'web',
  whatsapp_sender_name text,
  whatsapp_sender_phone text,
  created_at timestamp with time zone DEFAULT now()
);

-- ticket_deadline_notifications
CREATE TABLE IF NOT EXISTS public.ticket_deadline_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  old_priority text,
  new_priority text,
  notified_users jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- rack_occupancy_history
CREATE TABLE IF NOT EXISTS public.rack_occupancy_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rack_id uuid REFERENCES public.racks(id),
  equipment_id uuid REFERENCES public.equipment(id),
  equipment_name text NOT NULL,
  action text NOT NULL,
  position_u_start integer NOT NULL,
  position_u_end integer NOT NULL,
  mount_side text DEFAULT 'front',
  previous_rack_id uuid REFERENCES public.racks(id),
  performed_by uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- rack_annotations
CREATE TABLE IF NOT EXISTS public.rack_annotations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rack_id uuid NOT NULL REFERENCES public.racks(id) ON DELETE CASCADE,
  position_u integer NOT NULL,
  position_side text DEFAULT 'front',
  title text NOT NULL,
  description text,
  annotation_type text NOT NULL,
  priority text DEFAULT 'medium',
  due_date timestamp with time zone,
  color text DEFAULT '#3b82f6',
  icon text DEFAULT 'info',
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- floor_plans
CREATE TABLE IF NOT EXISTS public.floor_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  floor_id uuid NOT NULL REFERENCES public.floors(id) ON DELETE CASCADE,
  name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL,
  original_width integer,
  original_height integer,
  is_active boolean DEFAULT true,
  uploaded_by uuid,
  scale_ratio integer DEFAULT 100,
  pixels_per_cm numeric DEFAULT 10,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- rack_positions
CREATE TABLE IF NOT EXISTS public.rack_positions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  floor_plan_id uuid NOT NULL REFERENCES public.floor_plans(id) ON DELETE CASCADE,
  rack_id uuid NOT NULL REFERENCES public.racks(id) ON DELETE CASCADE,
  position_x numeric NOT NULL,
  position_y numeric NOT NULL,
  rotation integer DEFAULT 0,
  width numeric DEFAULT 60,
  height numeric DEFAULT 100,
  icon_style text DEFAULT 'default',
  icon_size text DEFAULT 'medium',
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(floor_plan_id, rack_id)
);

-- equipment_positions
CREATE TABLE IF NOT EXISTS public.equipment_positions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  floor_plan_id uuid NOT NULL REFERENCES public.floor_plans(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  position_x numeric NOT NULL,
  position_y numeric NOT NULL,
  rotation integer DEFAULT 0,
  icon_size text DEFAULT 'medium',
  custom_label text,
  custom_icon text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(floor_plan_id, equipment_id)
);

-- floor_plan_measurements
CREATE TABLE IF NOT EXISTS public.floor_plan_measurements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  floor_plan_id uuid NOT NULL REFERENCES public.floor_plans(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  description text,
  points jsonb NOT NULL,
  scale numeric NOT NULL DEFAULT 100,
  is_closed boolean DEFAULT false,
  total_distance numeric,
  area numeric,
  color varchar(7) DEFAULT '#ef4444',
  category varchar(50) DEFAULT 'geral',
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- vlans
CREATE TABLE IF NOT EXISTS public.vlans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vlan_id integer NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'data',
  color text DEFAULT '#3b82f6',
  building_id uuid REFERENCES public.buildings(id),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid
);

-- Add FK from connections to vlans
ALTER TABLE public.connections ADD CONSTRAINT connections_vlan_uuid_fkey 
  FOREIGN KEY (vlan_uuid) REFERENCES public.vlans(id);

-- subnets
CREATE TABLE IF NOT EXISTS public.subnets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  ip_version text NOT NULL DEFAULT 'ipv4',
  cidr text NOT NULL UNIQUE,
  network_address text NOT NULL,
  prefix_length integer NOT NULL,
  gateway_ip text,
  gateway_name text,
  broadcast_address text,
  total_addresses bigint NOT NULL,
  usable_addresses bigint NOT NULL,
  vlan_id integer,
  vlan_uuid uuid REFERENCES public.vlans(id),
  building_id uuid REFERENCES public.buildings(id),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid
);

-- ip_addresses
CREATE TABLE IF NOT EXISTS public.ip_addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subnet_id uuid NOT NULL REFERENCES public.subnets(id) ON DELETE CASCADE,
  ip_address text NOT NULL,
  name text,
  ip_type text NOT NULL DEFAULT 'host',
  status text NOT NULL DEFAULT 'available',
  equipment_id uuid REFERENCES public.equipment(id),
  notes text,
  last_seen timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(subnet_id, ip_address)
);

-- monitoring_panels
CREATE TABLE IF NOT EXISTS public.monitoring_panels (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  url text NOT NULL,
  panel_type text NOT NULL DEFAULT 'grafana',
  description text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- system_settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL,
  updated_by uuid,
  updated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- system_knowledge
CREATE TABLE IF NOT EXISTS public.system_knowledge (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL,
  topic text NOT NULL,
  content text NOT NULL,
  keywords text[],
  version integer DEFAULT 1,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- chat_messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  session_id uuid NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- landing_content
CREATE TABLE IF NOT EXISTS public.landing_content (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_key varchar(100) NOT NULL UNIQUE,
  content_type varchar(50) NOT NULL,
  title varchar(255),
  description text,
  icon varchar(50),
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- landing_screenshots
CREATE TABLE IF NOT EXISTS public.landing_screenshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  image_url text NOT NULL,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- whatsapp_groups
CREATE TABLE IF NOT EXISTS public.whatsapp_groups (
  id text NOT NULL PRIMARY KEY,
  subject text NOT NULL,
  description text,
  owner text,
  size integer DEFAULT 0,
  picture_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- whatsapp_notifications
CREATE TABLE IF NOT EXISTS public.whatsapp_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid REFERENCES public.support_tickets(id),
  phone_number text NOT NULL,
  message_type text NOT NULL,
  message_content text NOT NULL,
  status text DEFAULT 'pending',
  external_id text,
  error_message text,
  sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- whatsapp_sessions
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone text NOT NULL UNIQUE,
  state text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- whatsapp_interactions
CREATE TABLE IF NOT EXISTS public.whatsapp_interactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number text NOT NULL,
  message_received text NOT NULL,
  command text,
  args text,
  response_sent text,
  response_status text DEFAULT 'success',
  processing_time_ms integer,
  is_group boolean DEFAULT false,
  group_id text,
  created_at timestamp with time zone DEFAULT now()
);

-- whatsapp_message_mapping
CREATE TABLE IF NOT EXISTS public.whatsapp_message_mapping (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  message_id text NOT NULL,
  group_id text,
  phone_number text,
  direction text DEFAULT 'outbound',
  created_at timestamp with time zone DEFAULT now()
);

-- whatsapp_templates
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_type text NOT NULL UNIQUE,
  template_name text NOT NULL,
  template_content text NOT NULL,
  variables text[] DEFAULT '{}'::text[],
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ============================================================
-- 5. VIEWS
-- ============================================================

CREATE OR REPLACE VIEW public.v_port_availability AS
SELECT e.id AS equipment_id,
    e.name AS equipment_name,
    e.type AS equipment_type,
    count(p.id) AS total_ports,
    count(CASE WHEN p.status = 'available'::port_status THEN 1 ELSE NULL END) AS available_ports,
    count(CASE WHEN p.status = 'in_use'::port_status THEN 1 ELSE NULL END) AS in_use_ports
FROM equipment e
LEFT JOIN ports p ON e.id = p.equipment_id
GROUP BY e.id, e.name, e.type;

CREATE OR REPLACE VIEW public.v_connection_details AS
SELECT c.id, c.connection_code, c.cable_type, c.cable_length_meters, c.cable_color,
    c.status, c.installed_at, c.notes, c.vlan_id, c.vlan_name, c.vlan_tagging,
    c.port_a_id, c.port_b_id,
    pa.name AS port_a_name, pb.name AS port_b_name,
    ea.id AS equipment_a_id, ea.name AS equipment_a_name, ea.type AS equipment_a_type,
    eb.id AS equipment_b_id, eb.name AS equipment_b_name, eb.type AS equipment_b_type,
    ra.id AS rack_a_id, ra.name AS rack_a_name,
    rb.id AS rack_b_id, rb.name AS rack_b_name
FROM connections c
LEFT JOIN ports pa ON c.port_a_id = pa.id
LEFT JOIN ports pb ON c.port_b_id = pb.id
LEFT JOIN equipment ea ON pa.equipment_id = ea.id
LEFT JOIN equipment eb ON pb.equipment_id = eb.id
LEFT JOIN racks ra ON ea.rack_id = ra.id
LEFT JOIN racks rb ON eb.rack_id = rb.id;

-- ============================================================
-- 6. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_access_logs_connection ON public.access_logs USING btree (connection_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_user ON public.access_logs USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.alerts USING btree (status);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.alerts USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON public.alerts USING btree (type);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON public.alerts USING btree (severity);
CREATE INDEX IF NOT EXISTS idx_buildings_state ON public.buildings USING btree (state);
CREATE INDEX IF NOT EXISTS idx_buildings_city ON public.buildings USING btree (city);
CREATE INDEX IF NOT EXISTS idx_buildings_type ON public.buildings USING btree (building_type);
CREATE INDEX IF NOT EXISTS idx_buildings_internal_code ON public.buildings USING btree (internal_code);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON public.chat_messages USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON public.chat_messages USING btree (session_id);
CREATE INDEX IF NOT EXISTS idx_connections_ports ON public.connections USING btree (port_a_id, port_b_id);
CREATE INDEX IF NOT EXISTS idx_connections_code ON public.connections USING btree (connection_code);
CREATE INDEX IF NOT EXISTS idx_connections_vlan_uuid ON public.connections USING btree (vlan_uuid);
CREATE INDEX IF NOT EXISTS idx_connections_vlan_id ON public.connections USING btree (vlan_id);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON public.equipment USING btree (equipment_status);
CREATE INDEX IF NOT EXISTS idx_equipment_mount_side ON public.equipment USING btree (mount_side);
CREATE INDEX IF NOT EXISTS idx_equipment_asset_tag ON public.equipment USING btree (asset_tag) WHERE (asset_tag IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_equipment_rack ON public.equipment USING btree (rack_id);
CREATE INDEX IF NOT EXISTS idx_floor_plan_measurements_category ON public.floor_plan_measurements USING btree (floor_plan_id, category);
CREATE INDEX IF NOT EXISTS idx_floor_plan_measurements_floor_plan_id ON public.floor_plan_measurements USING btree (floor_plan_id);
CREATE INDEX IF NOT EXISTS idx_floors_building ON public.floors USING btree (building_id);
CREATE INDEX IF NOT EXISTS idx_floors_access_control ON public.floors USING btree (has_access_control);
CREATE INDEX IF NOT EXISTS idx_ip_addresses_subnet ON public.ip_addresses USING btree (subnet_id);
CREATE INDEX IF NOT EXISTS idx_ip_addresses_status ON public.ip_addresses USING btree (status);
CREATE INDEX IF NOT EXISTS idx_ip_addresses_equipment ON public.ip_addresses USING btree (equipment_id);
CREATE INDEX IF NOT EXISTS idx_ip_addresses_ip ON public.ip_addresses USING btree (ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_addresses_name ON public.ip_addresses USING btree (name) WHERE (name IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_labels_connection ON public.labels USING btree (connection_id);
CREATE INDEX IF NOT EXISTS idx_ports_equipment ON public.ports USING btree (equipment_id);
CREATE INDEX IF NOT EXISTS idx_ports_port_type ON public.ports USING btree (port_type);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles USING btree (phone);
CREATE INDEX IF NOT EXISTS idx_rack_annotations_rack_id ON public.rack_annotations USING btree (rack_id);
CREATE INDEX IF NOT EXISTS idx_rack_annotations_due_date ON public.rack_annotations USING btree (due_date) WHERE (due_date IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_rack_history_date ON public.rack_occupancy_history USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rack_history_rack ON public.rack_occupancy_history USING btree (rack_id);
CREATE INDEX IF NOT EXISTS idx_rack_history_equipment ON public.rack_occupancy_history USING btree (equipment_id);
CREATE INDEX IF NOT EXISTS idx_rack_positions_floor_plan ON public.rack_positions USING btree (floor_plan_id);
CREATE INDEX IF NOT EXISTS idx_rack_positions_rack ON public.rack_positions USING btree (rack_id);
CREATE INDEX IF NOT EXISTS idx_racks_room ON public.racks USING btree (room_id);
CREATE INDEX IF NOT EXISTS idx_rooms_type ON public.rooms USING btree (room_type);
CREATE INDEX IF NOT EXISTS idx_rooms_access_control ON public.rooms USING btree (has_access_control);
CREATE INDEX IF NOT EXISTS idx_rooms_floor ON public.rooms USING btree (floor_id);
CREATE INDEX IF NOT EXISTS idx_subnets_vlan_uuid ON public.subnets USING btree (vlan_uuid);
CREATE INDEX IF NOT EXISTS idx_subnets_cidr ON public.subnets USING btree (cidr);
CREATE INDEX IF NOT EXISTS idx_subnets_building ON public.subnets USING btree (building_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_keywords ON public.system_knowledge USING gin (keywords);
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON public.system_knowledge USING btree (category);
CREATE INDEX IF NOT EXISTS idx_ticket_deadline_notifications_created_at ON public.ticket_deadline_notifications USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_ticket_deadline_notifications_type ON public.ticket_deadline_notifications USING btree (notification_type);
CREATE INDEX IF NOT EXISTS idx_ticket_deadline_notifications_ticket_id ON public.ticket_deadline_notifications USING btree (ticket_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_vlans_category ON public.vlans USING btree (category);
CREATE INDEX IF NOT EXISTS idx_vlans_building_id ON public.vlans USING btree (building_id);
CREATE INDEX IF NOT EXISTS idx_vlans_vlan_id ON public.vlans USING btree (vlan_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_interactions_phone ON public.whatsapp_interactions USING btree (phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_interactions_command ON public.whatsapp_interactions USING btree (command);
CREATE INDEX IF NOT EXISTS idx_whatsapp_interactions_created ON public.whatsapp_interactions USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_message_mapping_ticket_id ON public.whatsapp_message_mapping USING btree (ticket_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_message_mapping_message_id ON public.whatsapp_message_mapping USING btree (message_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_updated_at ON public.whatsapp_sessions USING btree (updated_at);

-- ============================================================
-- 7. TRIGGERS
-- ============================================================

CREATE TRIGGER update_buildings_updated_at BEFORE UPDATE ON public.buildings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_floors_updated_at BEFORE UPDATE ON public.floors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_racks_updated_at BEFORE UPDATE ON public.racks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON public.equipment FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_ports_updated_at BEFORE UPDATE ON public.ports FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_connections_updated_at BEFORE UPDATE ON public.connections FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_set_connection_code BEFORE INSERT ON public.connections FOR EACH ROW EXECUTE FUNCTION set_connection_code();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_notification_settings_updated_at BEFORE UPDATE ON public.notification_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_ticket_number BEFORE INSERT ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION generate_ticket_number();
CREATE TRIGGER update_rack_annotations_updated_at BEFORE UPDATE ON public.rack_annotations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_alert_settings_updated_at_trigger BEFORE UPDATE ON public.alert_settings FOR EACH ROW EXECUTE FUNCTION update_alert_settings_updated_at();
CREATE TRIGGER equipment_install_history_trigger AFTER INSERT ON public.equipment FOR EACH ROW EXECUTE FUNCTION log_equipment_install();
CREATE TRIGGER equipment_change_history_trigger AFTER UPDATE ON public.equipment FOR EACH ROW WHEN (((old.rack_id IS DISTINCT FROM new.rack_id) OR (old.position_u_start IS DISTINCT FROM new.position_u_start) OR (old.position_u_end IS DISTINCT FROM new.position_u_end))) EXECUTE FUNCTION log_equipment_change();
CREATE TRIGGER update_floor_plans_updated_at BEFORE UPDATE ON public.floor_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rack_positions_updated_at BEFORE UPDATE ON public.rack_positions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_equipment_positions_updated_at BEFORE UPDATE ON public.equipment_positions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_floor_plan_measurements_updated_at BEFORE UPDATE ON public.floor_plan_measurements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ip_addresses_updated_at BEFORE UPDATE ON public.ip_addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subnets_updated_at BEFORE UPDATE ON public.subnets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_vlans_updated_at BEFORE UPDATE ON public.vlans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_monitoring_panels_updated_at BEFORE UPDATE ON public.monitoring_panels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_knowledge_updated_at BEFORE UPDATE ON public.system_knowledge FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_landing_content_updated_at BEFORE UPDATE ON public.landing_content FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_landing_screenshots_updated_at BEFORE UPDATE ON public.landing_screenshots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_groups_updated_at BEFORE UPDATE ON public.whatsapp_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_sessions_updated_at BEFORE UPDATE ON public.whatsapp_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_templates_updated_at BEFORE UPDATE ON public.whatsapp_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auth trigger: auto-create profile on signup
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 8. ENABLE RLS ON ALL TABLES
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.racks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_deadline_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rack_occupancy_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rack_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floor_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rack_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floor_plan_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vlans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subnets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_message_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 9. RLS POLICIES
-- ============================================================

-- profiles
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- user_roles
CREATE POLICY "Anyone can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Only admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));

-- buildings
CREATE POLICY "Anyone authenticated can view buildings" ON public.buildings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can insert buildings" ON public.buildings FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Only admins can update buildings" ON public.buildings FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Only admins can delete buildings" ON public.buildings FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));

-- floors
CREATE POLICY "Anyone authenticated can view floors" ON public.floors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can manage floors" ON public.floors FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));

-- rooms
CREATE POLICY "Anyone authenticated can view rooms" ON public.rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can manage rooms" ON public.rooms FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));

-- racks
CREATE POLICY "Anyone authenticated can view racks" ON public.racks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can manage racks" ON public.racks FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));

-- equipment
CREATE POLICY "Anyone authenticated can view equipment" ON public.equipment FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and technicians can manage equipment" ON public.equipment FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'technician'::user_role));

-- ports
CREATE POLICY "Anyone authenticated can view ports" ON public.ports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and technicians can manage ports" ON public.ports FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'technician'::user_role));

-- connections
CREATE POLICY "Anyone authenticated can view connections" ON public.connections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and technicians can manage connections" ON public.connections FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'technician'::user_role));
CREATE POLICY "Viewers can view connections they scanned" ON public.connections FOR SELECT TO authenticated USING (has_role(auth.uid(), 'viewer'::user_role) AND (id IN (SELECT connection_id FROM access_logs WHERE user_id = auth.uid() AND action = 'qr_scanned')));
CREATE POLICY "Network viewers can view connections they scanned" ON public.connections FOR SELECT USING (has_role(auth.uid(), 'network_viewer'::user_role) AND (id IN (SELECT connection_id FROM access_logs WHERE user_id = auth.uid() AND action = 'qr_scanned')));

-- labels
CREATE POLICY "Anyone authenticated can view labels" ON public.labels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and technicians can manage labels" ON public.labels FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'technician'::user_role));

-- alerts
CREATE POLICY "Anyone authenticated can view alerts" ON public.alerts FOR SELECT USING (true);
CREATE POLICY "Admins and technicians can manage alerts" ON public.alerts FOR UPDATE USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'technician'::user_role));
CREATE POLICY "System can insert alerts" ON public.alerts FOR INSERT WITH CHECK (true);

-- alert_settings
CREATE POLICY "Anyone authenticated can view alert settings" ON public.alert_settings FOR SELECT USING (true);
CREATE POLICY "Only admins can manage alert settings" ON public.alert_settings FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));

-- access_logs
CREATE POLICY "Admins can view all logs" ON public.access_logs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Users can view their own logs" ON public.access_logs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Anyone authenticated can insert logs" ON public.access_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Viewers can insert their own scan logs" ON public.access_logs FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'viewer'::user_role) AND user_id = auth.uid());
CREATE POLICY "Viewers can view their own scan logs" ON public.access_logs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'viewer'::user_role) AND user_id = auth.uid() AND action = 'qr_scanned');
CREATE POLICY "Network viewers can view their own scan logs" ON public.access_logs FOR SELECT USING (has_role(auth.uid(), 'network_viewer'::user_role) AND user_id = auth.uid() AND action = 'qr_scanned');

-- notification_settings
CREATE POLICY "Users can view their own notification settings" ON public.notification_settings FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all notification settings" ON public.notification_settings FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Users can insert their own notification settings" ON public.notification_settings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own notification settings" ON public.notification_settings FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- support_tickets
CREATE POLICY "Users can view tickets" ON public.support_tickets FOR SELECT TO authenticated USING (created_by = auth.uid() OR assigned_to = auth.uid() OR has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'technician'::user_role));
CREATE POLICY "Authenticated users can create tickets" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Admins and technicians can update tickets" ON public.support_tickets FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'technician'::user_role) OR created_by = auth.uid());
CREATE POLICY "Admins can delete tickets" ON public.support_tickets FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));

-- ticket_comments
CREATE POLICY "Users can view comments on visible tickets" ON public.ticket_comments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM support_tickets st WHERE st.id = ticket_comments.ticket_id AND (st.created_by = auth.uid() OR st.assigned_to = auth.uid() OR has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'technician'::user_role))));
CREATE POLICY "Authenticated users can add comments" ON public.ticket_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete their own comments" ON public.ticket_comments FOR DELETE TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::user_role));

-- ticket_deadline_notifications
CREATE POLICY "Admins and technicians can view deadline notifications" ON public.ticket_deadline_notifications FOR SELECT USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = ANY (ARRAY['admin'::user_role, 'technician'::user_role])));
CREATE POLICY "System can insert deadline notifications" ON public.ticket_deadline_notifications FOR INSERT WITH CHECK (true);

-- rack_occupancy_history
CREATE POLICY "Anyone authenticated can view rack history" ON public.rack_occupancy_history FOR SELECT USING (true);
CREATE POLICY "System can insert rack history" ON public.rack_occupancy_history FOR INSERT WITH CHECK (true);

-- rack_annotations
CREATE POLICY "Anyone authenticated can view annotations" ON public.rack_annotations FOR SELECT USING (true);
CREATE POLICY "Admins and technicians can manage annotations" ON public.rack_annotations FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'technician'::user_role));

-- floor_plans
CREATE POLICY "Anyone authenticated can view floor plans" ON public.floor_plans FOR SELECT USING (true);
CREATE POLICY "Admins and technicians can manage floor plans" ON public.floor_plans FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'technician'::user_role));

-- rack_positions
CREATE POLICY "Anyone authenticated can view rack positions" ON public.rack_positions FOR SELECT USING (true);
CREATE POLICY "Admins and technicians can manage rack positions" ON public.rack_positions FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'technician'::user_role));

-- equipment_positions
CREATE POLICY "Anyone authenticated can view equipment positions" ON public.equipment_positions FOR SELECT USING (true);
CREATE POLICY "Admins and technicians can manage equipment positions" ON public.equipment_positions FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'technician'::user_role));

-- floor_plan_measurements
CREATE POLICY "Anyone authenticated can view measurements" ON public.floor_plan_measurements FOR SELECT USING (true);
CREATE POLICY "Admins and technicians can manage measurements" ON public.floor_plan_measurements FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'technician'::user_role));

-- vlans
CREATE POLICY "Anyone authenticated can view vlans" ON public.vlans FOR SELECT USING (true);
CREATE POLICY "Admins and technicians can manage vlans" ON public.vlans FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'technician'::user_role));

-- subnets
CREATE POLICY "Anyone authenticated can view subnets" ON public.subnets FOR SELECT USING (true);
CREATE POLICY "Admins and technicians can manage subnets" ON public.subnets FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'technician'::user_role));

-- ip_addresses
CREATE POLICY "Anyone authenticated can view ip_addresses" ON public.ip_addresses FOR SELECT USING (true);
CREATE POLICY "Admins and technicians can manage ip_addresses" ON public.ip_addresses FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'technician'::user_role));

-- monitoring_panels
CREATE POLICY "Authenticated users can view monitoring panels" ON public.monitoring_panels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert monitoring panels" ON public.monitoring_panels FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::user_role));
CREATE POLICY "Admins can update monitoring panels" ON public.monitoring_panels FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::user_role));
CREATE POLICY "Admins can delete monitoring panels" ON public.monitoring_panels FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::user_role));

-- system_settings
CREATE POLICY "Admins can view system settings" ON public.system_settings FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Admins can manage system settings" ON public.system_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::user_role)) WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- system_knowledge
CREATE POLICY "Authenticated users can read knowledge" ON public.system_knowledge FOR SELECT USING (true);
CREATE POLICY "Admins can manage knowledge" ON public.system_knowledge FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));

-- chat_messages
CREATE POLICY "Users can read own chat history" ON public.chat_messages FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own messages" ON public.chat_messages FOR INSERT WITH CHECK (user_id = auth.uid());

-- landing_content
CREATE POLICY "Leitura pública de landing_content" ON public.landing_content FOR SELECT USING (true);
CREATE POLICY "Admins podem gerenciar landing_content" ON public.landing_content FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));

-- landing_screenshots
CREATE POLICY "Leitura pública de screenshots" ON public.landing_screenshots FOR SELECT USING (true);
CREATE POLICY "Admins podem inserir screenshots" ON public.landing_screenshots FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Admins podem atualizar screenshots" ON public.landing_screenshots FOR UPDATE USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Admins podem deletar screenshots" ON public.landing_screenshots FOR DELETE USING (has_role(auth.uid(), 'admin'::user_role));

-- whatsapp_groups
CREATE POLICY "Authenticated users can read whatsapp groups" ON public.whatsapp_groups FOR SELECT USING (true);
CREATE POLICY "Admins and technicians can manage whatsapp groups" ON public.whatsapp_groups FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'technician'::user_role));

-- whatsapp_notifications
CREATE POLICY "Admins and technicians can view notifications" ON public.whatsapp_notifications FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'technician'::user_role));
CREATE POLICY "System can insert notifications" ON public.whatsapp_notifications FOR INSERT TO authenticated WITH CHECK (true);

-- whatsapp_sessions
CREATE POLICY "Service role can manage sessions" ON public.whatsapp_sessions FOR ALL USING (true) WITH CHECK (true);

-- whatsapp_interactions
CREATE POLICY "Admins e técnicos podem ver interações" ON public.whatsapp_interactions FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'technician'::user_role));
CREATE POLICY "Sistema pode inserir interações" ON public.whatsapp_interactions FOR INSERT WITH CHECK (true);

-- whatsapp_message_mapping
CREATE POLICY "Authenticated users can view mappings" ON public.whatsapp_message_mapping FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert mappings" ON public.whatsapp_message_mapping FOR INSERT TO authenticated WITH CHECK (true);

-- whatsapp_templates
CREATE POLICY "Anyone authenticated can view templates" ON public.whatsapp_templates FOR SELECT USING (true);
CREATE POLICY "Admins can manage templates" ON public.whatsapp_templates FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));

-- ============================================================
-- 10. STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('public', 'public', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('floor-plans', 'floor-plans', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('landing-assets', 'landing-assets', true) ON CONFLICT DO NOTHING;

-- Storage policies
CREATE POLICY "Public read access" ON storage.objects FOR SELECT USING (bucket_id IN ('public', 'avatars', 'floor-plans', 'landing-assets'));
CREATE POLICY "Authenticated upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('public', 'avatars', 'floor-plans', 'landing-assets'));
CREATE POLICY "Authenticated update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id IN ('public', 'avatars', 'floor-plans', 'landing-assets'));
CREATE POLICY "Authenticated delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id IN ('public', 'avatars', 'floor-plans', 'landing-assets'));

-- ============================================================
-- 11. REALTIME
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;

-- ============================================================
-- 12. INITIAL DATA
-- ============================================================

INSERT INTO public.alert_settings (setting_key, setting_value, description) VALUES
  ('rack_capacity_warning', 80, 'Percentual de ocupação do rack para alerta de aviso'),
  ('rack_capacity_critical', 95, 'Percentual de ocupação do rack para alerta crítico'),
  ('port_capacity_warning', 80, 'Percentual de portas em uso para alerta de aviso'),
  ('port_capacity_critical', 95, 'Percentual de portas em uso para alerta crítico'),
  ('poe_capacity_warning', 80, 'Percentual do budget PoE para alerta de aviso'),
  ('poe_capacity_critical', 95, 'Percentual do budget PoE para alerta crítico')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================================
-- MIGRAÇÃO CONCLUÍDA!
-- ============================================================
SELECT 'Migração completa executada com sucesso!' as status;
