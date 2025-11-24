-- Add notes column to floors table
ALTER TABLE floors ADD COLUMN IF NOT EXISTS notes TEXT;