-- Add category column for measurement layers
ALTER TABLE floor_plan_measurements 
ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'geral';

-- Create index for faster category filtering
CREATE INDEX IF NOT EXISTS idx_floor_plan_measurements_category 
ON floor_plan_measurements(floor_plan_id, category);