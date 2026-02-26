-- Fix security definer views by using invoker rights
ALTER VIEW public.v_connection_details SET (security_invoker = true);
ALTER VIEW public.v_port_availability SET (security_invoker = true);

-- Fix mutable search_path on functions
ALTER FUNCTION public.generate_connection_code() SET search_path = public;
ALTER FUNCTION public.log_equipment_change() SET search_path = public;
ALTER FUNCTION public.log_equipment_install() SET search_path = public;
ALTER FUNCTION public.set_connection_code() SET search_path = public;
ALTER FUNCTION public.update_updated_at() SET search_path = public;

-- Remove overly-permissive INSERT policies (service role / triggers can still write)
DROP POLICY IF EXISTS "System can insert alerts" ON public.alerts;
DROP POLICY IF EXISTS "System can insert rack history" ON public.rack_occupancy_history;
DROP POLICY IF EXISTS "System can insert deadline notifications" ON public.ticket_deadline_notifications;
DROP POLICY IF EXISTS "Sistema pode inserir interações" ON public.whatsapp_interactions;
DROP POLICY IF EXISTS "Authenticated users can insert mappings" ON public.whatsapp_message_mapping;
DROP POLICY IF EXISTS "System can insert notifications" ON public.whatsapp_notifications;