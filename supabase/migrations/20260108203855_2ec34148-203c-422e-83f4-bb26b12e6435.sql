-- Adicionar novos campos à tabela monitored_devices
ALTER TABLE public.monitored_devices 
ADD COLUMN IF NOT EXISTS server_address TEXT DEFAULT '86.48.3.172:3000',
ADD COLUMN IF NOT EXISTS monitored_host TEXT;

-- Atualizar dispositivo existente
UPDATE public.monitored_devices 
SET monitored_host = '179.124.212.112',
    server_address = '86.48.3.172:3000'
WHERE device_id = 'iw-01';

-- Criar tabela para armazenar métricas SNMP
CREATE TABLE IF NOT EXISTS public.snmp_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_uuid UUID REFERENCES public.monitored_devices(id) ON DELETE CASCADE,
  oid TEXT NOT NULL,
  oid_name TEXT,
  value TEXT,
  category TEXT,
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_snmp_metrics_device_uuid ON public.snmp_metrics(device_uuid);
CREATE INDEX IF NOT EXISTS idx_snmp_metrics_collected_at ON public.snmp_metrics(collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_snmp_metrics_category ON public.snmp_metrics(category);

-- RLS
ALTER TABLE public.snmp_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view snmp_metrics"
ON public.snmp_metrics FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert snmp_metrics"
ON public.snmp_metrics FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete snmp_metrics"
ON public.snmp_metrics FOR DELETE
TO authenticated
USING (true);