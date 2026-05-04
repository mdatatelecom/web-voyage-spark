
-- Add retry queue columns to whatsapp_notifications
ALTER TABLE public.whatsapp_notifications
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS payload jsonb;

CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_ticket_id ON public.whatsapp_notifications(ticket_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_retry ON public.whatsapp_notifications(status, next_retry_at) WHERE status = 'retrying';

-- Allow ticket creators / assignees to view notifications related to their tickets
DROP POLICY IF EXISTS "Ticket participants can view their ticket notifications" ON public.whatsapp_notifications;
CREATE POLICY "Ticket participants can view their ticket notifications"
ON public.whatsapp_notifications
FOR SELECT
TO authenticated
USING (
  ticket_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.support_tickets st
    WHERE st.id = whatsapp_notifications.ticket_id
      AND (st.created_by = auth.uid() OR st.assigned_to = auth.uid())
  )
);

-- Enable realtime
ALTER TABLE public.whatsapp_notifications REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'whatsapp_notifications'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_notifications';
  END IF;
END $$;
