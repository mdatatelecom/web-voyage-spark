
-- ai_settings (singleton)
CREATE TABLE public.ai_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  temperature numeric NOT NULL DEFAULT 0.3,
  max_tokens integer NOT NULL DEFAULT 2048,
  prompt_template text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT true,
  auto_analyze boolean NOT NULL DEFAULT false,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view ai_settings"
  ON public.ai_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage ai_settings"
  ON public.ai_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE TRIGGER trg_ai_settings_updated_at
  BEFORE UPDATE ON public.ai_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.ai_settings (prompt_template) VALUES (
'Você é um especialista em Infraestrutura Linux, Redes, CFTV, Câmeras IP, Mikrotik, Zabbix e monitoramento corporativo.

Analise o alerta do Zabbix recebido.

Regras:
- Traduza o alerta para português do Brasil.
- Explique o problema de forma simples e técnica.
- Identifique possíveis causas.
- Sugira comandos Linux, rede e diagnóstico.
- Sugira verificações no Zabbix.
- Sugira análise de câmeras e conectividade quando aplicável.
- Gere um checklist passo a passo para resolução.
- Gere um resumo formatado para envio via WhatsApp.
- Seja direto, técnico e organizado.'
);

-- zabbix_ai_analysis
CREATE TABLE public.zabbix_ai_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid REFERENCES public.alerts(id) ON DELETE SET NULL,
  host text,
  trigger_name text,
  severity text,
  category text,
  priority text,
  original_alert jsonb,
  summary text,
  translation text,
  causes jsonb DEFAULT '[]'::jsonb,
  commands jsonb DEFAULT '[]'::jsonb,
  checklist jsonb DEFAULT '[]'::jsonb,
  recommendations jsonb DEFAULT '[]'::jsonb,
  whatsapp_message text,
  model_used text,
  tokens_used integer,
  status text NOT NULL DEFAULT 'completed',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX idx_zai_alert ON public.zabbix_ai_analysis(alert_id);
CREATE INDEX idx_zai_host ON public.zabbix_ai_analysis(host);
CREATE INDEX idx_zai_created ON public.zabbix_ai_analysis(created_at DESC);

ALTER TABLE public.zabbix_ai_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and technicians can view ai analyses"
  ON public.zabbix_ai_analysis FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'technician'::user_role));

CREATE POLICY "Admins and technicians can insert ai analyses"
  ON public.zabbix_ai_analysis FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'technician'::user_role));

CREATE POLICY "Admins can delete ai analyses"
  ON public.zabbix_ai_analysis FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role));
