-- Habilitar extensões necessárias para cron job
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Agendar verificação de prazos de chamados a cada hora
-- Executa no minuto 0 de cada hora
SELECT cron.schedule(
  'check-ticket-deadlines-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('supabase.functions_endpoint') || '/check-ticket-deadlines',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase.anon_key')
    ),
    body := jsonb_build_object(
      'triggered_by', 'cron',
      'timestamp', now()::text
    )
  ) AS request_id;
  $$
);

-- Comentário para documentação
COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL - usado para verificar prazos de chamados a cada hora';