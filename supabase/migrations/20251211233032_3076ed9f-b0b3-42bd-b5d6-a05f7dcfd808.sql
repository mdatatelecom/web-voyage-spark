-- Add fixed_shelf to equipment_type enum
ALTER TYPE public.equipment_type ADD VALUE IF NOT EXISTS 'fixed_shelf';