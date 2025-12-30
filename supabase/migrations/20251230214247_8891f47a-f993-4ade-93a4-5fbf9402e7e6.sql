-- Create floor_plans table for storing floor plan images
CREATE TABLE public.floor_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id UUID NOT NULL REFERENCES public.floors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  original_width INTEGER,
  original_height INTEGER,
  is_active BOOLEAN DEFAULT true,
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create equipment_positions table for storing equipment locations on floor plans
CREATE TABLE public.equipment_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_plan_id UUID NOT NULL REFERENCES public.floor_plans(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  position_x NUMERIC NOT NULL,
  position_y NUMERIC NOT NULL,
  rotation INTEGER DEFAULT 0,
  icon_size TEXT DEFAULT 'medium',
  custom_label TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(floor_plan_id, equipment_id)
);

-- Enable RLS
ALTER TABLE public.floor_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_positions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for floor_plans
CREATE POLICY "Anyone authenticated can view floor plans"
  ON public.floor_plans FOR SELECT
  USING (true);

CREATE POLICY "Admins and technicians can manage floor plans"
  ON public.floor_plans FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'technician'::user_role));

-- RLS Policies for equipment_positions
CREATE POLICY "Anyone authenticated can view equipment positions"
  ON public.equipment_positions FOR SELECT
  USING (true);

CREATE POLICY "Admins and technicians can manage equipment positions"
  ON public.equipment_positions FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'technician'::user_role));

-- Triggers for updated_at
CREATE TRIGGER update_floor_plans_updated_at
  BEFORE UPDATE ON public.floor_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipment_positions_updated_at
  BEFORE UPDATE ON public.equipment_positions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for floor plans
INSERT INTO storage.buckets (id, name, public) 
VALUES ('floor-plans', 'floor-plans', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for floor-plans bucket
CREATE POLICY "Anyone can view floor plans images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'floor-plans');

CREATE POLICY "Admins and technicians can upload floor plans"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'floor-plans' AND (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'technician'::user_role)
  ));

CREATE POLICY "Admins and technicians can update floor plans"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'floor-plans' AND (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'technician'::user_role)
  ));

CREATE POLICY "Admins and technicians can delete floor plans"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'floor-plans' AND (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'technician'::user_role)
  ));