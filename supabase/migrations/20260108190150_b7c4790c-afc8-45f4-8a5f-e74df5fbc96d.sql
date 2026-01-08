-- Tabela de dispositivos monitorados
CREATE TABLE public.monitored_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT UNIQUE NOT NULL,
  hostname TEXT,
  vendor TEXT,
  model TEXT,
  ip_address TEXT,
  api_token TEXT,
  is_active BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'unknown',
  last_seen TIMESTAMPTZ,
  uptime_raw TEXT,
  customer_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- Tabela de interfaces monitoradas
CREATE TABLE public.monitored_interfaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_uuid UUID NOT NULL REFERENCES public.monitored_devices(id) ON DELETE CASCADE,
  interface_name TEXT NOT NULL,
  interface_type TEXT DEFAULT 'ethernet',
  is_monitored BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'unknown',
  rx_bytes BIGINT DEFAULT 0,
  tx_bytes BIGINT DEFAULT 0,
  speed TEXT,
  mac_address TEXT,
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(device_uuid, interface_name)
);

-- Tabela de VLANs monitoradas
CREATE TABLE public.monitored_vlans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_uuid UUID NOT NULL REFERENCES public.monitored_devices(id) ON DELETE CASCADE,
  vlan_id INTEGER NOT NULL,
  vlan_name TEXT,
  is_monitored BOOLEAN DEFAULT false,
  interfaces JSONB DEFAULT '[]',
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(device_uuid, vlan_id)
);

-- Tabela de histórico de uptime
CREATE TABLE public.device_uptime_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_uuid UUID NOT NULL REFERENCES public.monitored_devices(id) ON DELETE CASCADE,
  is_online BOOLEAN NOT NULL,
  uptime_raw TEXT,
  response_time_ms INTEGER,
  collected_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.monitored_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitored_interfaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitored_vlans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_uptime_history ENABLE ROW LEVEL SECURITY;

-- Policies para monitored_devices
CREATE POLICY "Anyone authenticated can view monitored devices"
ON public.monitored_devices FOR SELECT
USING (true);

CREATE POLICY "Admins and technicians can manage monitored devices"
ON public.monitored_devices FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'technician'::user_role));

-- Policies para monitored_interfaces
CREATE POLICY "Anyone authenticated can view monitored interfaces"
ON public.monitored_interfaces FOR SELECT
USING (true);

CREATE POLICY "Admins and technicians can manage monitored interfaces"
ON public.monitored_interfaces FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'technician'::user_role));

-- Policies para monitored_vlans
CREATE POLICY "Anyone authenticated can view monitored vlans"
ON public.monitored_vlans FOR SELECT
USING (true);

CREATE POLICY "Admins and technicians can manage monitored vlans"
ON public.monitored_vlans FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'technician'::user_role));

-- Policies para device_uptime_history
CREATE POLICY "Anyone authenticated can view uptime history"
ON public.device_uptime_history FOR SELECT
USING (true);

CREATE POLICY "System can insert uptime history"
ON public.device_uptime_history FOR INSERT
WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_monitored_devices_updated_at
BEFORE UPDATE ON public.monitored_devices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Índices
CREATE INDEX idx_monitored_devices_status ON public.monitored_devices(status);
CREATE INDEX idx_monitored_devices_is_active ON public.monitored_devices(is_active);
CREATE INDEX idx_monitored_interfaces_device ON public.monitored_interfaces(device_uuid);
CREATE INDEX idx_monitored_vlans_device ON public.monitored_vlans(device_uuid);
CREATE INDEX idx_device_uptime_history_device ON public.device_uptime_history(device_uuid);
CREATE INDEX idx_device_uptime_history_collected ON public.device_uptime_history(collected_at DESC);