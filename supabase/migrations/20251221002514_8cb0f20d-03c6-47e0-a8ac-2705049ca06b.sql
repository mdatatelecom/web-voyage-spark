-- Corrigir função generate_ticket_number com search_path
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
  year_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO year_count 
  FROM public.support_tickets 
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
  
  NEW.ticket_number := 'TKT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(year_count::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;