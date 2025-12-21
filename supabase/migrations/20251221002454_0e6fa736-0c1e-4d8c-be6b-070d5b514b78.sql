-- Tabela principal de chamados técnicos
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,
  
  -- Informações básicas
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Classificação
  category TEXT NOT NULL DEFAULT 'other',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  
  -- Relacionamentos opcionais
  related_equipment_id UUID REFERENCES equipment(id) ON DELETE SET NULL,
  related_rack_id UUID REFERENCES racks(id) ON DELETE SET NULL,
  related_room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  related_building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
  
  -- Atribuição
  created_by UUID NOT NULL,
  assigned_to UUID,
  
  -- Contatos WhatsApp
  contact_phone TEXT,
  technician_phone TEXT,
  
  -- Anexos
  attachments JSONB DEFAULT '[]'::jsonb,
  
  -- Datas
  due_date TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de comentários do chamado
CREATE TABLE public.ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de log de notificações WhatsApp
CREATE TABLE public.whatsapp_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  message_type TEXT NOT NULL,
  message_content TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  external_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies para support_tickets
CREATE POLICY "Users can view tickets" ON support_tickets
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid() 
    OR assigned_to = auth.uid() 
    OR public.has_role(auth.uid(), 'admin'::user_role) 
    OR public.has_role(auth.uid(), 'technician'::user_role)
  );

CREATE POLICY "Authenticated users can create tickets" ON support_tickets
  FOR INSERT TO authenticated 
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins and technicians can update tickets" ON support_tickets
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::user_role) 
    OR public.has_role(auth.uid(), 'technician'::user_role)
    OR created_by = auth.uid()
  );

CREATE POLICY "Admins can delete tickets" ON support_tickets
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::user_role));

-- RLS Policies para ticket_comments
CREATE POLICY "Users can view comments on visible tickets" ON ticket_comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets st 
      WHERE st.id = ticket_id 
      AND (st.created_by = auth.uid() OR st.assigned_to = auth.uid() 
           OR public.has_role(auth.uid(), 'admin'::user_role) 
           OR public.has_role(auth.uid(), 'technician'::user_role))
    )
  );

CREATE POLICY "Authenticated users can add comments" ON ticket_comments
  FOR INSERT TO authenticated 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments" ON ticket_comments
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::user_role));

-- RLS Policies para whatsapp_notifications (apenas admin/technician)
CREATE POLICY "Admins and technicians can view notifications" ON whatsapp_notifications
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::user_role) 
    OR public.has_role(auth.uid(), 'technician'::user_role)
  );

CREATE POLICY "System can insert notifications" ON whatsapp_notifications
  FOR INSERT TO authenticated WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Função para gerar número do ticket
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
  year_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO year_count 
  FROM support_tickets 
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
  
  NEW.ticket_number := 'TKT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(year_count::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_ticket_number
  BEFORE INSERT ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION generate_ticket_number();

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_comments;