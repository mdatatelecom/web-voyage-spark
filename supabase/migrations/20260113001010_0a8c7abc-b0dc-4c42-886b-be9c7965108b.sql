-- Tabela para logs de sincronização
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_by TEXT NOT NULL DEFAULT 'cron',
  devices_synced INTEGER DEFAULT 0,
  devices_failed INTEGER DEFAULT 0,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  details JSONB,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Índice para consultas por data
CREATE INDEX idx_sync_logs_started_at ON public.sync_logs(started_at DESC);

-- Habilitar RLS
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Política para leitura por usuários autenticados
CREATE POLICY "Authenticated users can read sync logs"
ON public.sync_logs FOR SELECT
TO authenticated
USING (true);

-- Política para inserção via service role (cron/edge functions)
CREATE POLICY "Service role can insert sync logs"
ON public.sync_logs FOR INSERT
TO service_role
WITH CHECK (true);

-- Função de limpeza de dados antigos
CREATE OR REPLACE FUNCTION public.cleanup_old_monitoring_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Deletar métricas SNMP com mais de 30 dias
  DELETE FROM snmp_metrics 
  WHERE collected_at < now() - interval '30 days';
  
  -- Deletar histórico de uptime com mais de 90 dias
  DELETE FROM device_uptime_history 
  WHERE collected_at < now() - interval '90 days';
  
  -- Deletar logs de sincronização com mais de 7 dias
  DELETE FROM sync_logs 
  WHERE started_at < now() - interval '7 days';
END;
$$;