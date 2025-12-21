-- Create function to update timestamps (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create table for customizable WhatsApp message templates
CREATE TABLE public.whatsapp_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_type TEXT NOT NULL UNIQUE,
  template_name TEXT NOT NULL,
  template_content TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage templates" 
ON public.whatsapp_templates 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Anyone authenticated can view templates" 
ON public.whatsapp_templates 
FOR SELECT 
USING (true);

-- Insert default templates
INSERT INTO public.whatsapp_templates (template_type, template_name, template_content, variables) VALUES
  ('ticket_created', 'Chamado Criado', 
   E'🎫 *Novo Chamado Aberto*\n\nNúmero: *{{ticket_number}}*\nTítulo: {{title}}\nPrioridade: {{priority}}\n\nAcompanhe pelo sistema.', 
   ARRAY['ticket_number', 'title', 'priority']),
  
  ('ticket_status_changed', 'Status Alterado',
   E'🔔 *Atualização de Chamado*\n\nChamado: *{{ticket_number}}*\nNovo Status: {{status}}\n\n{{status_message}}',
   ARRAY['ticket_number', 'status', 'status_message']),
  
  ('alert_critical', 'Alerta Crítico',
   E'🚨 *ALERTA CRÍTICO*\n\n{{title}}\n\n{{message}}\n\nAcesse o sistema para detalhes.',
   ARRAY['title', 'message']),
  
  ('alert_warning', 'Alerta de Aviso',
   E'⚠️ *Aviso do Sistema*\n\n{{title}}\n\n{{message}}',
   ARRAY['title', 'message']),
  
  ('test', 'Mensagem de Teste',
   E'✅ Teste de integração WhatsApp realizado com sucesso!\n\n*Sistema de Racks*',
   ARRAY[]::TEXT[]);

-- Create updated_at trigger
CREATE TRIGGER update_whatsapp_templates_updated_at
BEFORE UPDATE ON public.whatsapp_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();