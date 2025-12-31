-- Add icon_size column to rack_positions table
ALTER TABLE rack_positions 
ADD COLUMN IF NOT EXISTS icon_size TEXT DEFAULT 'medium' 
CHECK (icon_size IN ('small', 'medium', 'large'));