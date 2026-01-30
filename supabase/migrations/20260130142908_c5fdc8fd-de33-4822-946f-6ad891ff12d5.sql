-- Create monitoring panels table for Grafana/Zabbix dashboard embedding
CREATE TABLE public.monitoring_panels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  panel_type TEXT NOT NULL DEFAULT 'grafana',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Add constraint for panel_type
ALTER TABLE public.monitoring_panels 
  ADD CONSTRAINT monitoring_panels_panel_type_check 
  CHECK (panel_type IN ('grafana', 'zabbix', 'other'));

-- Enable RLS
ALTER TABLE public.monitoring_panels ENABLE ROW LEVEL SECURITY;

-- Policies - all authenticated users can view panels
CREATE POLICY "Authenticated users can view monitoring panels" 
  ON public.monitoring_panels 
  FOR SELECT 
  TO authenticated
  USING (true);

-- Only admins can manage panels
CREATE POLICY "Admins can insert monitoring panels" 
  ON public.monitoring_panels 
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update monitoring panels" 
  ON public.monitoring_panels 
  FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete monitoring panels" 
  ON public.monitoring_panels 
  FOR DELETE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_monitoring_panels_updated_at
  BEFORE UPDATE ON public.monitoring_panels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();