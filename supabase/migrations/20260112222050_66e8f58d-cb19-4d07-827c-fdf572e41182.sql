-- Add new columns to monitored_devices for Grafana/Zabbix integration
ALTER TABLE public.monitored_devices 
ADD COLUMN IF NOT EXISTS data_source_type TEXT DEFAULT 'snmp',
ADD COLUMN IF NOT EXISTS grafana_host_id TEXT,
ADD COLUMN IF NOT EXISTS grafana_dashboard_uid TEXT,
ADD COLUMN IF NOT EXISTS zabbix_host_id TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.monitored_devices.data_source_type IS 'Source of monitoring data: snmp, grafana, or hybrid';
COMMENT ON COLUMN public.monitored_devices.grafana_host_id IS 'Host ID in Grafana/Zabbix datasource';
COMMENT ON COLUMN public.monitored_devices.grafana_dashboard_uid IS 'UID of associated Grafana dashboard';
COMMENT ON COLUMN public.monitored_devices.zabbix_host_id IS 'Host ID in Zabbix for direct API calls';

-- Create grafana_config table for global Grafana settings
CREATE TABLE IF NOT EXISTS public.grafana_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grafana_url TEXT NOT NULL,
  grafana_org_id INTEGER DEFAULT 1,
  datasource_name TEXT DEFAULT 'Zabbix',
  datasource_uid TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for grafana_config
ALTER TABLE public.grafana_config ENABLE ROW LEVEL SECURITY;

-- RLS policies for grafana_config
CREATE POLICY "Authenticated users can view grafana_config"
ON public.grafana_config FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert grafana_config"
ON public.grafana_config FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update grafana_config"
ON public.grafana_config FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete grafana_config"
ON public.grafana_config FOR DELETE
TO authenticated
USING (true);

-- Create zabbix_hosts_cache table
CREATE TABLE IF NOT EXISTS public.zabbix_hosts_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id TEXT NOT NULL UNIQUE,
  host_name TEXT NOT NULL,
  host_display_name TEXT,
  groups JSONB DEFAULT '[]'::jsonb,
  interfaces JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'enabled',
  last_synced TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for zabbix_hosts_cache
ALTER TABLE public.zabbix_hosts_cache ENABLE ROW LEVEL SECURITY;

-- RLS policies for zabbix_hosts_cache
CREATE POLICY "Authenticated users can view zabbix_hosts_cache"
ON public.zabbix_hosts_cache FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert zabbix_hosts_cache"
ON public.zabbix_hosts_cache FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update zabbix_hosts_cache"
ON public.zabbix_hosts_cache FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete zabbix_hosts_cache"
ON public.zabbix_hosts_cache FOR DELETE
TO authenticated
USING (true);

-- Add updated_at trigger for grafana_config
CREATE TRIGGER update_grafana_config_updated_at
BEFORE UPDATE ON public.grafana_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_monitored_devices_data_source_type ON public.monitored_devices(data_source_type);
CREATE INDEX IF NOT EXISTS idx_monitored_devices_zabbix_host_id ON public.monitored_devices(zabbix_host_id);
CREATE INDEX IF NOT EXISTS idx_zabbix_hosts_cache_host_id ON public.zabbix_hosts_cache(host_id);
CREATE INDEX IF NOT EXISTS idx_zabbix_hosts_cache_host_name ON public.zabbix_hosts_cache(host_name);