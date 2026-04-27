ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS whatsapp_group_id text;
ALTER TABLE public.ticket_categories ADD COLUMN IF NOT EXISTS whatsapp_group_id text;