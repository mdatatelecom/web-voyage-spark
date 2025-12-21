-- Create table for WhatsApp wizard sessions
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for cleaning old sessions
CREATE INDEX idx_whatsapp_sessions_updated_at ON public.whatsapp_sessions(updated_at);

-- Enable RLS
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- Policy to allow service role access (edge functions use service role)
CREATE POLICY "Service role can manage sessions"
ON public.whatsapp_sessions
FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger to update updated_at
CREATE TRIGGER update_whatsapp_sessions_updated_at
  BEFORE UPDATE ON public.whatsapp_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();