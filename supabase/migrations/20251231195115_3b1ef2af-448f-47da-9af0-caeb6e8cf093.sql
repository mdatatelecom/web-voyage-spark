-- Add scale columns to floor_plans table
ALTER TABLE floor_plans 
ADD COLUMN IF NOT EXISTS scale_ratio INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS pixels_per_cm DECIMAL(6,2) DEFAULT 10;

-- Create rack_positions table for placing racks on floor plans
CREATE TABLE IF NOT EXISTS rack_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_plan_id UUID NOT NULL REFERENCES floor_plans(id) ON DELETE CASCADE,
  rack_id UUID NOT NULL REFERENCES racks(id) ON DELETE CASCADE,
  position_x DECIMAL(10,2) NOT NULL,
  position_y DECIMAL(10,2) NOT NULL,
  rotation INTEGER DEFAULT 0,
  width DECIMAL(10,2) DEFAULT 60,
  height DECIMAL(10,2) DEFAULT 100,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(floor_plan_id, rack_id)
);

-- Enable RLS
ALTER TABLE rack_positions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rack_positions
CREATE POLICY "Anyone authenticated can view rack positions" 
ON rack_positions FOR SELECT USING (true);

CREATE POLICY "Admins and technicians can manage rack positions" 
ON rack_positions FOR ALL USING (
  has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'technician'::user_role)
);

-- Create trigger for updated_at
CREATE TRIGGER update_rack_positions_updated_at
BEFORE UPDATE ON rack_positions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rack_positions_floor_plan ON rack_positions(floor_plan_id);
CREATE INDEX IF NOT EXISTS idx_rack_positions_rack ON rack_positions(rack_id);