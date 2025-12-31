-- Create table for saving floor plan measurements
CREATE TABLE public.floor_plan_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_plan_id UUID NOT NULL REFERENCES public.floor_plans(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  points JSONB NOT NULL,
  scale NUMERIC NOT NULL DEFAULT 100,
  is_closed BOOLEAN DEFAULT false,
  total_distance NUMERIC(10,3),
  area NUMERIC(10,3),
  color VARCHAR(7) DEFAULT '#ef4444',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.floor_plan_measurements ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone authenticated can view measurements"
  ON public.floor_plan_measurements FOR SELECT
  USING (true);

CREATE POLICY "Admins and technicians can manage measurements"
  ON public.floor_plan_measurements FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'technician'::user_role));

-- Create trigger for updated_at
CREATE TRIGGER update_floor_plan_measurements_updated_at
  BEFORE UPDATE ON public.floor_plan_measurements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_floor_plan_measurements_floor_plan_id ON public.floor_plan_measurements(floor_plan_id);