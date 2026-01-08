-- Tabela de configuração de alertas offline
CREATE TABLE IF NOT EXISTS public.device_offline_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_uuid UUID REFERENCES public.monitored_devices(id) ON DELETE CASCADE,
  offline_threshold_minutes INTEGER DEFAULT 5,
  whatsapp_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  last_alert_sent_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de snapshots de configuração para comparação
CREATE TABLE IF NOT EXISTS public.device_config_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_uuid UUID REFERENCES public.monitored_devices(id) ON DELETE CASCADE,
  config_type TEXT NOT NULL, -- 'vlans', 'interfaces', 'full'
  config_data JSONB NOT NULL,
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_device_offline_alerts_device ON public.device_offline_alerts(device_uuid);
CREATE INDEX IF NOT EXISTS idx_device_config_snapshots_device ON public.device_config_snapshots(device_uuid);
CREATE INDEX IF NOT EXISTS idx_device_config_snapshots_type ON public.device_config_snapshots(config_type);
CREATE INDEX IF NOT EXISTS idx_device_config_snapshots_collected ON public.device_config_snapshots(collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_snmp_metrics_device ON public.snmp_metrics(device_uuid);
CREATE INDEX IF NOT EXISTS idx_snmp_metrics_collected ON public.snmp_metrics(collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_snmp_metrics_category ON public.snmp_metrics(category);

-- RLS para device_offline_alerts
ALTER TABLE public.device_offline_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view offline alerts"
ON public.device_offline_alerts FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert offline alerts"
ON public.device_offline_alerts FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update offline alerts"
ON public.device_offline_alerts FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete offline alerts"
ON public.device_offline_alerts FOR DELETE
TO authenticated
USING (true);

-- RLS para device_config_snapshots
ALTER TABLE public.device_config_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view config snapshots"
ON public.device_config_snapshots FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert config snapshots"
ON public.device_config_snapshots FOR INSERT
TO authenticated
WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_device_offline_alerts_updated_at
BEFORE UPDATE ON public.device_offline_alerts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();