-- Add mount_side column to equipment table
ALTER TABLE equipment 
ADD COLUMN IF NOT EXISTS mount_side text DEFAULT 'front' 
CHECK (mount_side IN ('front', 'rear', 'both'));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_equipment_mount_side ON equipment(mount_side);

-- Add comment for documentation
COMMENT ON COLUMN equipment.mount_side IS 'Equipment mounting position: front (default), rear (back of rack), both (dual-sided)';