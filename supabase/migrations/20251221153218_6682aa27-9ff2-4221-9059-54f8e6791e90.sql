-- Create whatsapp_message_mapping table to track messages for replies
CREATE TABLE public.whatsapp_message_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,
  group_id TEXT,
  phone_number TEXT,
  direction TEXT DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add index for faster lookups by message_id
CREATE INDEX idx_whatsapp_message_mapping_message_id ON public.whatsapp_message_mapping(message_id);
CREATE INDEX idx_whatsapp_message_mapping_ticket_id ON public.whatsapp_message_mapping(ticket_id);

-- Enable RLS
ALTER TABLE public.whatsapp_message_mapping ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view mappings" 
ON public.whatsapp_message_mapping 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert mappings" 
ON public.whatsapp_message_mapping 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Add source column to ticket_comments to identify origin (web, whatsapp, system)
ALTER TABLE public.ticket_comments 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'web';

-- Add whatsapp sender info columns
ALTER TABLE public.ticket_comments 
ADD COLUMN IF NOT EXISTS whatsapp_sender_name TEXT;

ALTER TABLE public.ticket_comments 
ADD COLUMN IF NOT EXISTS whatsapp_sender_phone TEXT;