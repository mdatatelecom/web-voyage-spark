-- Create enums
CREATE TYPE public.user_role AS ENUM ('admin', 'technician', 'viewer');
CREATE TYPE public.equipment_type AS ENUM ('switch', 'router', 'server', 'patch_panel', 'firewall', 'storage', 'other');
CREATE TYPE public.cable_type AS ENUM ('utp_cat5e', 'utp_cat6', 'utp_cat6a', 'fiber_om3', 'fiber_om4', 'fiber_os2', 'dac', 'other');
CREATE TYPE public.connection_status AS ENUM ('active', 'inactive', 'reserved', 'testing', 'faulty');
CREATE TYPE public.port_status AS ENUM ('available', 'in_use', 'reserved', 'disabled');

-- Create locations table
CREATE TABLE public.buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  floor_number INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id UUID NOT NULL REFERENCES public.floors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  room_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create racks table
CREATE TABLE public.racks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size_u INTEGER NOT NULL DEFAULT 42,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create equipment table
CREATE TABLE public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rack_id UUID NOT NULL REFERENCES public.racks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type public.equipment_type NOT NULL,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  hostname TEXT,
  ip_address TEXT,
  position_u_start INTEGER,
  position_u_end INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create ports table
CREATE TABLE public.ports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  port_number INTEGER,
  status public.port_status NOT NULL DEFAULT 'available',
  speed TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(equipment_id, name)
);

-- Create connections table (core of the system)
CREATE TABLE public.connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_code TEXT NOT NULL UNIQUE,
  port_a_id UUID NOT NULL REFERENCES public.ports(id) ON DELETE RESTRICT,
  port_b_id UUID NOT NULL REFERENCES public.ports(id) ON DELETE RESTRICT,
  cable_type public.cable_type NOT NULL,
  cable_length_meters DECIMAL(5,2),
  cable_color TEXT,
  status public.connection_status NOT NULL DEFAULT 'active',
  notes TEXT,
  installed_by UUID REFERENCES auth.users(id),
  installed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (port_a_id != port_b_id)
);

-- Create labels table
CREATE TABLE public.labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  qr_code_data TEXT NOT NULL,
  label_file_url TEXT,
  generated_by UUID REFERENCES auth.users(id),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  printed_at TIMESTAMPTZ,
  print_count INTEGER NOT NULL DEFAULT 0
);

-- Create user roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, role)
);

-- Create access logs table
CREATE TABLE public.access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.connections(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.user_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create view for connection details
CREATE OR REPLACE VIEW public.v_connection_details AS
SELECT 
  c.id,
  c.connection_code,
  c.cable_type,
  c.cable_length_meters,
  c.cable_color,
  c.status,
  c.notes,
  c.installed_at,
  pa.id AS port_a_id,
  pa.name AS port_a_name,
  ea.id AS equipment_a_id,
  ea.name AS equipment_a_name,
  ea.type AS equipment_a_type,
  ra.id AS rack_a_id,
  ra.name AS rack_a_name,
  pb.id AS port_b_id,
  pb.name AS port_b_name,
  eb.id AS equipment_b_id,
  eb.name AS equipment_b_name,
  eb.type AS equipment_b_type,
  rb.id AS rack_b_id,
  rb.name AS rack_b_name
FROM public.connections c
JOIN public.ports pa ON c.port_a_id = pa.id
JOIN public.equipment ea ON pa.equipment_id = ea.id
JOIN public.racks ra ON ea.rack_id = ra.id
JOIN public.ports pb ON c.port_b_id = pb.id
JOIN public.equipment eb ON pb.equipment_id = eb.id
JOIN public.racks rb ON eb.rack_id = rb.id;

-- Create view for port availability
CREATE OR REPLACE VIEW public.v_port_availability AS
SELECT 
  e.id AS equipment_id,
  e.name AS equipment_name,
  e.type AS equipment_type,
  COUNT(p.id) AS total_ports,
  COUNT(CASE WHEN p.status = 'available' THEN 1 END) AS available_ports,
  COUNT(CASE WHEN p.status = 'in_use' THEN 1 END) AS in_use_ports
FROM public.equipment e
LEFT JOIN public.ports p ON e.id = p.equipment_id
GROUP BY e.id, e.name, e.type;

-- Enable RLS on all tables
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.racks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for buildings
CREATE POLICY "Anyone authenticated can view buildings"
  ON public.buildings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert buildings"
  ON public.buildings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update buildings"
  ON public.buildings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete buildings"
  ON public.buildings FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for floors
CREATE POLICY "Anyone authenticated can view floors"
  ON public.floors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage floors"
  ON public.floors FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for rooms
CREATE POLICY "Anyone authenticated can view rooms"
  ON public.rooms FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage rooms"
  ON public.rooms FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for racks
CREATE POLICY "Anyone authenticated can view racks"
  ON public.racks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage racks"
  ON public.racks FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for equipment
CREATE POLICY "Anyone authenticated can view equipment"
  ON public.equipment FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and technicians can manage equipment"
  ON public.equipment FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'technician'));

-- RLS Policies for ports
CREATE POLICY "Anyone authenticated can view ports"
  ON public.ports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and technicians can manage ports"
  ON public.ports FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'technician'));

-- RLS Policies for connections
CREATE POLICY "Anyone authenticated can view connections"
  ON public.connections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and technicians can manage connections"
  ON public.connections FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'technician'));

-- RLS Policies for labels
CREATE POLICY "Anyone authenticated can view labels"
  ON public.labels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and technicians can manage labels"
  ON public.labels FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'technician'));

-- RLS Policies for user_roles
CREATE POLICY "Anyone can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for access_logs
CREATE POLICY "Users can view their own logs"
  ON public.access_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all logs"
  ON public.access_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone authenticated can insert logs"
  ON public.access_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for profiles
CREATE POLICY "Anyone can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Create trigger function for profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', '')
  );
  RETURN new;
END;
$$;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to generate sequential connection codes
CREATE SEQUENCE public.connection_code_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_connection_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
  code TEXT;
BEGIN
  next_num := nextval('public.connection_code_seq');
  code := 'C-' || LPAD(next_num::TEXT, 5, '0');
  RETURN code;
END;
$$;

-- Create trigger to auto-generate connection codes
CREATE OR REPLACE FUNCTION public.set_connection_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.connection_code IS NULL THEN
    NEW.connection_code := public.generate_connection_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_connection_code
  BEFORE INSERT ON public.connections
  FOR EACH ROW EXECUTE FUNCTION public.set_connection_code();

-- Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_buildings_updated_at
  BEFORE UPDATE ON public.buildings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_floors_updated_at
  BEFORE UPDATE ON public.floors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_racks_updated_at
  BEFORE UPDATE ON public.racks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_equipment_updated_at
  BEFORE UPDATE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_ports_updated_at
  BEFORE UPDATE ON public.ports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_connections_updated_at
  BEFORE UPDATE ON public.connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Create indexes for performance
CREATE INDEX idx_floors_building ON public.floors(building_id);
CREATE INDEX idx_rooms_floor ON public.rooms(floor_id);
CREATE INDEX idx_racks_room ON public.racks(room_id);
CREATE INDEX idx_equipment_rack ON public.equipment(rack_id);
CREATE INDEX idx_ports_equipment ON public.ports(equipment_id);
CREATE INDEX idx_connections_ports ON public.connections(port_a_id, port_b_id);
CREATE INDEX idx_connections_code ON public.connections(connection_code);
CREATE INDEX idx_labels_connection ON public.labels(connection_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_access_logs_user ON public.access_logs(user_id);
CREATE INDEX idx_access_logs_connection ON public.access_logs(connection_id);