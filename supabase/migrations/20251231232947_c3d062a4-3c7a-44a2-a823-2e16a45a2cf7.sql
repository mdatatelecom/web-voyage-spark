-- Tabela para rastrear notificações de deadline enviadas
CREATE TABLE IF NOT EXISTS public.ticket_deadline_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'warning_24h', 'critical_4h', 'overdue', 'escalation'
  old_priority TEXT,
  new_priority TEXT,
  notified_users JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_ticket_deadline_notifications_ticket_id ON public.ticket_deadline_notifications(ticket_id);
CREATE INDEX idx_ticket_deadline_notifications_type ON public.ticket_deadline_notifications(notification_type);
CREATE INDEX idx_ticket_deadline_notifications_created_at ON public.ticket_deadline_notifications(created_at);

-- Enable RLS
ALTER TABLE public.ticket_deadline_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies - apenas admins e técnicos podem ver
CREATE POLICY "Admins and technicians can view deadline notifications"
ON public.ticket_deadline_notifications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'technician')
  )
);

CREATE POLICY "System can insert deadline notifications"
ON public.ticket_deadline_notifications
FOR INSERT
WITH CHECK (true);

-- Adicionar configurações de deadline alerts (se não existirem)
INSERT INTO public.alert_settings (setting_key, setting_value, description)
VALUES 
  ('ticket_deadline_warning_hours', 24, 'Horas antes do prazo para alertar (warning)'),
  ('ticket_deadline_critical_hours', 4, 'Horas antes do prazo para alerta crítico'),
  ('ticket_auto_escalation_enabled', 1, 'Habilitar escalonamento automático de prioridade (1=sim, 0=não)'),
  ('ticket_deadline_whatsapp_enabled', 1, 'Habilitar notificações WhatsApp de prazo (1=sim, 0=não)')
ON CONFLICT (setting_key) DO NOTHING;