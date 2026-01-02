-- Tabela de Sub-redes
CREATE TABLE public.subnets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  ip_version TEXT NOT NULL DEFAULT 'ipv4' CHECK (ip_version IN ('ipv4', 'ipv6')),
  cidr TEXT NOT NULL UNIQUE,
  network_address TEXT NOT NULL,
  prefix_length INTEGER NOT NULL,
  gateway_ip TEXT,
  gateway_name TEXT,
  broadcast_address TEXT,
  total_addresses BIGINT NOT NULL,
  usable_addresses BIGINT NOT NULL,
  vlan_id INTEGER,
  building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- Tabela de Endereços IP
CREATE TABLE public.ip_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subnet_id UUID NOT NULL REFERENCES public.subnets(id) ON DELETE CASCADE,
  ip_address TEXT NOT NULL,
  name TEXT,
  ip_type TEXT NOT NULL DEFAULT 'host' CHECK (ip_type IN ('network', 'gateway', 'host', 'broadcast', 'reserved')),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'used')),
  equipment_id UUID REFERENCES public.equipment(id) ON DELETE SET NULL,
  notes TEXT,
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(subnet_id, ip_address)
);

-- Índices para performance
CREATE INDEX idx_ip_addresses_subnet ON public.ip_addresses(subnet_id);
CREATE INDEX idx_ip_addresses_status ON public.ip_addresses(status);
CREATE INDEX idx_ip_addresses_equipment ON public.ip_addresses(equipment_id);
CREATE INDEX idx_ip_addresses_ip ON public.ip_addresses(ip_address);
CREATE INDEX idx_ip_addresses_name ON public.ip_addresses(name) WHERE name IS NOT NULL;
CREATE INDEX idx_subnets_cidr ON public.subnets(cidr);
CREATE INDEX idx_subnets_building ON public.subnets(building_id);

-- Enable RLS
ALTER TABLE public.subnets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_addresses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subnets
CREATE POLICY "Anyone authenticated can view subnets"
ON public.subnets FOR SELECT
USING (true);

CREATE POLICY "Admins and technicians can manage subnets"
ON public.subnets FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'technician'::user_role));

-- RLS Policies for ip_addresses
CREATE POLICY "Anyone authenticated can view ip_addresses"
ON public.ip_addresses FOR SELECT
USING (true);

CREATE POLICY "Admins and technicians can manage ip_addresses"
ON public.ip_addresses FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'technician'::user_role));

-- Triggers for updated_at
CREATE TRIGGER update_subnets_updated_at
BEFORE UPDATE ON public.subnets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ip_addresses_updated_at
BEFORE UPDATE ON public.ip_addresses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();