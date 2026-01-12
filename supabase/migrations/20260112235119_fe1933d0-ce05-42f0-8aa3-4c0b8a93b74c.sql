-- Adicionar coluna external_panel_url para URL do painel Grafana externo
ALTER TABLE public.monitored_devices 
ADD COLUMN IF NOT EXISTS external_panel_url TEXT DEFAULT NULL;

COMMENT ON COLUMN public.monitored_devices.external_panel_url 
IS 'URL do painel Grafana para compartilhamento/embed externo';