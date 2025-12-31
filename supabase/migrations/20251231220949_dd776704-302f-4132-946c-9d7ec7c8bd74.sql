-- Tabela para log de interações WhatsApp
CREATE TABLE whatsapp_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  message_received TEXT NOT NULL,
  command TEXT,
  args TEXT,
  response_sent TEXT,
  response_status TEXT DEFAULT 'success',
  processing_time_ms INTEGER,
  is_group BOOLEAN DEFAULT false,
  group_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_whatsapp_interactions_phone ON whatsapp_interactions(phone_number);
CREATE INDEX idx_whatsapp_interactions_command ON whatsapp_interactions(command);
CREATE INDEX idx_whatsapp_interactions_created ON whatsapp_interactions(created_at DESC);

-- RLS
ALTER TABLE whatsapp_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins e técnicos podem ver interações"
  ON whatsapp_interactions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'technician'::user_role));

CREATE POLICY "Sistema pode inserir interações"
  ON whatsapp_interactions FOR INSERT
  WITH CHECK (true);