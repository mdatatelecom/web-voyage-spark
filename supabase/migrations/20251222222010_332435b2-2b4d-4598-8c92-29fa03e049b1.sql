-- Create table to cache WhatsApp group information
CREATE TABLE public.whatsapp_groups (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  description TEXT,
  owner TEXT,
  size INTEGER DEFAULT 0,
  picture_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_groups ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read groups
CREATE POLICY "Authenticated users can read whatsapp groups"
ON public.whatsapp_groups
FOR SELECT
USING (true);

-- Policy for admins and technicians to manage groups
CREATE POLICY "Admins and technicians can manage whatsapp groups"
ON public.whatsapp_groups
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'technician'::user_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_whatsapp_groups_updated_at
BEFORE UPDATE ON public.whatsapp_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();