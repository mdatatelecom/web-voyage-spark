
ALTER TABLE public.equipment ALTER COLUMN rack_id DROP NOT NULL;
ALTER TABLE public.equipment DROP CONSTRAINT IF EXISTS equipment_rack_id_fkey;
ALTER TABLE public.equipment ADD CONSTRAINT equipment_rack_id_fkey 
  FOREIGN KEY (rack_id) REFERENCES public.racks(id) ON DELETE SET NULL;
