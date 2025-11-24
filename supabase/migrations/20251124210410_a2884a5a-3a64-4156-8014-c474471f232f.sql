-- Add VLAN fields to connections table
ALTER TABLE public.connections 
ADD COLUMN IF NOT EXISTS vlan_id integer,
ADD COLUMN IF NOT EXISTS vlan_name text,
ADD COLUMN IF NOT EXISTS vlan_tagging text DEFAULT 'untagged';

-- Add check constraint for vlan_tagging
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vlan_tagging_check'
  ) THEN
    ALTER TABLE public.connections 
    ADD CONSTRAINT vlan_tagging_check 
    CHECK (vlan_tagging IN ('tagged', 'untagged', 'native'));
  END IF;
END $$;

-- Add check constraint for vlan_id range (1-4094)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vlan_id_range_check'
  ) THEN
    ALTER TABLE public.connections 
    ADD CONSTRAINT vlan_id_range_check 
    CHECK (vlan_id IS NULL OR (vlan_id >= 1 AND vlan_id <= 4094));
  END IF;
END $$;

-- Create index on vlan_id for faster queries
CREATE INDEX IF NOT EXISTS idx_connections_vlan_id ON public.connections(vlan_id);

-- Update v_connection_details view to include VLAN fields
DROP VIEW IF EXISTS public.v_connection_details;

CREATE VIEW public.v_connection_details AS
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
FROM public.connections c
LEFT JOIN public.ports pa ON c.port_a_id = pa.id
LEFT JOIN public.ports pb ON c.port_b_id = pb.id
LEFT JOIN public.equipment ea ON pa.equipment_id = ea.id
LEFT JOIN public.equipment eb ON pb.equipment_id = eb.id
LEFT JOIN public.racks ra ON ea.rack_id = ra.id
LEFT JOIN public.racks rb ON eb.rack_id = rb.id;