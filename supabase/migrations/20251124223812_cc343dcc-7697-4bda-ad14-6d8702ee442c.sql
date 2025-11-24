-- Add cable organizer types to equipment_type enum
ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'cable_organizer_horizontal';
ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'cable_organizer_vertical';
ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'brush_panel';

-- Create rack_annotations table for 3D annotations
CREATE TABLE IF NOT EXISTS public.rack_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rack_id UUID REFERENCES public.racks(id) ON DELETE CASCADE NOT NULL,
  
  -- Position in rack
  position_u INTEGER NOT NULL,
  position_side TEXT DEFAULT 'front' CHECK (position_side IN ('front', 'rear', 'left', 'right')),
  
  -- Annotation content
  title TEXT NOT NULL,
  description TEXT,
  annotation_type TEXT NOT NULL CHECK (annotation_type IN ('attention', 'maintenance', 'note', 'warning', 'info')),
  
  -- Metadata
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  due_date TIMESTAMP WITH TIME ZONE,
  
  -- Visual styling
  color TEXT DEFAULT '#3b82f6',
  icon TEXT DEFAULT 'info',
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_rack_annotations_rack_id ON public.rack_annotations(rack_id);
CREATE INDEX IF NOT EXISTS idx_rack_annotations_due_date ON public.rack_annotations(due_date) WHERE due_date IS NOT NULL;

-- Enable RLS
ALTER TABLE public.rack_annotations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone authenticated can view annotations" ON public.rack_annotations
  FOR SELECT USING (true);

CREATE POLICY "Admins and technicians can manage annotations" ON public.rack_annotations
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin'::user_role) OR 
    public.has_role(auth.uid(), 'technician'::user_role)
  );

-- Trigger for updated_at
CREATE TRIGGER update_rack_annotations_updated_at
  BEFORE UPDATE ON public.rack_annotations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

COMMENT ON TABLE public.rack_annotations IS '3D annotations for racks: maintenance notes, warnings, technical observations';
COMMENT ON COLUMN public.rack_annotations.position_u IS 'U position in rack where annotation is placed';
COMMENT ON COLUMN public.rack_annotations.position_side IS 'Side of rack: front, rear, left, or right';
COMMENT ON COLUMN public.rack_annotations.annotation_type IS 'Type of annotation: attention, maintenance, note, warning, info';
COMMENT ON COLUMN public.rack_annotations.priority IS 'Priority level: low, medium, high, critical';