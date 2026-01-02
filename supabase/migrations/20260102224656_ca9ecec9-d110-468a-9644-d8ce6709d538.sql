-- Create vlans table for VLAN management
CREATE TABLE public.vlans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vlan_id INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'data',
  color TEXT DEFAULT '#3b82f6',
  building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  CONSTRAINT vlans_vlan_id_range CHECK (vlan_id >= 1 AND vlan_id <= 4094)
);

-- Add indexes for performance
CREATE INDEX idx_vlans_vlan_id ON public.vlans(vlan_id);
CREATE INDEX idx_vlans_category ON public.vlans(category);
CREATE INDEX idx_vlans_building_id ON public.vlans(building_id);

-- Trigger for updated_at
CREATE TRIGGER set_vlans_updated_at
  BEFORE UPDATE ON public.vlans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.vlans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone authenticated can view vlans" 
  ON public.vlans FOR SELECT USING (true);

CREATE POLICY "Admins and technicians can manage vlans" 
  ON public.vlans FOR ALL 
  USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'technician'::user_role));

-- Add vlan_uuid column to subnets table to link with vlans
ALTER TABLE public.subnets ADD COLUMN vlan_uuid UUID REFERENCES public.vlans(id) ON DELETE SET NULL;
CREATE INDEX idx_subnets_vlan_uuid ON public.subnets(vlan_uuid);

-- Add vlan_uuid column to connections table to link with vlans
ALTER TABLE public.connections ADD COLUMN vlan_uuid UUID REFERENCES public.vlans(id) ON DELETE SET NULL;
CREATE INDEX idx_connections_vlan_uuid ON public.connections(vlan_uuid);