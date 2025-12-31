-- Add custom_icon column to equipment_positions table
ALTER TABLE public.equipment_positions 
ADD COLUMN custom_icon TEXT DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.equipment_positions.custom_icon IS 'Custom icon override for the equipment marker. If NULL, uses equipment type for icon selection.';