-- Add notes column to buildings table
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN buildings.notes IS 'Observações adicionais sobre o prédio';