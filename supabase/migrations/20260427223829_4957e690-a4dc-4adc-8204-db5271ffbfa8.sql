CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_year INTEGER;
  v_seq_name TEXT;
  v_max_existing INTEGER;
  v_next_num BIGINT;
BEGIN
  v_year := EXTRACT(YEAR FROM NOW())::INTEGER;
  v_seq_name := 'ticket_number_seq_' || v_year;

  -- Serialize the (rare) sequence-creation path per year
  PERFORM pg_advisory_xact_lock(hashtext(v_seq_name));

  IF NOT EXISTS (
    SELECT 1 FROM pg_class
    WHERE relkind = 'S' AND relname = v_seq_name AND relnamespace = 'public'::regnamespace
  ) THEN
    -- Align with any pre-existing tickets (handles gaps and out-of-order numbers)
    SELECT COALESCE(MAX(
      NULLIF(regexp_replace(ticket_number, '^TKT-' || v_year || '-', ''), '')::INTEGER
    ), 0)
    INTO v_max_existing
    FROM public.support_tickets
    WHERE ticket_number ~ ('^TKT-' || v_year || '-[0-9]+$');

    EXECUTE format(
      'CREATE SEQUENCE IF NOT EXISTS public.%I START WITH %s MINVALUE 1',
      v_seq_name, v_max_existing + 1
    );
  END IF;

  EXECUTE format('SELECT nextval(''public.%I'')', v_seq_name) INTO v_next_num;

  NEW.ticket_number := 'TKT-' || v_year || '-' || LPAD(v_next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$function$;