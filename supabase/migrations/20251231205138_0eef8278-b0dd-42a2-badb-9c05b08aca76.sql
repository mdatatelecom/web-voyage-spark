-- Add icon_style column to rack_positions table
ALTER TABLE rack_positions 
ADD COLUMN IF NOT EXISTS icon_style TEXT DEFAULT 'default';