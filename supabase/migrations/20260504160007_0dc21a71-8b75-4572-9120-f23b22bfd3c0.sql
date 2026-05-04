
-- 1) Política mínima para whatsapp_sessions
DROP POLICY IF EXISTS "Only admins can manage whatsapp sessions" ON public.whatsapp_sessions;
CREATE POLICY "Only admins can manage whatsapp sessions"
ON public.whatsapp_sessions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- 2) Revogar EXECUTE público das funções SECURITY DEFINER internas
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.update_alert_settings_updated_at() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.log_equipment_install() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.log_equipment_change() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.set_connection_code() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_monitoring_data() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.generate_ticket_number() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.generate_connection_code() FROM anon, public;
