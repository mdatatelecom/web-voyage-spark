
-- Criar tabela de histórico de ocupação de rack
CREATE TABLE public.rack_occupancy_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rack_id UUID REFERENCES public.racks(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES public.equipment(id) ON DELETE SET NULL,
  equipment_name TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('installed', 'removed', 'moved')),
  position_u_start INTEGER NOT NULL,
  position_u_end INTEGER NOT NULL,
  mount_side TEXT DEFAULT 'front',
  previous_rack_id UUID REFERENCES public.racks(id) ON DELETE SET NULL,
  performed_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_rack_history_rack ON public.rack_occupancy_history(rack_id);
CREATE INDEX idx_rack_history_equipment ON public.rack_occupancy_history(equipment_id);
CREATE INDEX idx_rack_history_date ON public.rack_occupancy_history(created_at DESC);

-- Trigger para registrar instalação de equipamento
CREATE OR REPLACE FUNCTION public.log_equipment_install()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rack_id IS NOT NULL AND NEW.position_u_start IS NOT NULL THEN
    INSERT INTO public.rack_occupancy_history (
      rack_id, equipment_id, equipment_name, action,
      position_u_start, position_u_end, mount_side
    ) VALUES (
      NEW.rack_id, NEW.id, NEW.name, 'installed',
      NEW.position_u_start, COALESCE(NEW.position_u_end, NEW.position_u_start), 
      COALESCE(NEW.mount_side, 'front')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para registrar remoção/movimentação
CREATE OR REPLACE FUNCTION public.log_equipment_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Remoção do rack antigo
  IF OLD.rack_id IS NOT NULL AND (NEW.rack_id IS NULL OR NEW.rack_id != OLD.rack_id) THEN
    INSERT INTO public.rack_occupancy_history (
      rack_id, equipment_id, equipment_name, action,
      position_u_start, position_u_end, mount_side
    ) VALUES (
      OLD.rack_id, OLD.id, OLD.name, 'removed',
      OLD.position_u_start, COALESCE(OLD.position_u_end, OLD.position_u_start), 
      COALESCE(OLD.mount_side, 'front')
    );
  END IF;
  
  -- Instalação no novo rack (ou movimentação)
  IF NEW.rack_id IS NOT NULL AND NEW.position_u_start IS NOT NULL AND 
     (OLD.rack_id IS NULL OR NEW.rack_id != OLD.rack_id OR 
      OLD.position_u_start IS DISTINCT FROM NEW.position_u_start) THEN
    INSERT INTO public.rack_occupancy_history (
      rack_id, equipment_id, equipment_name, action,
      position_u_start, position_u_end, mount_side, previous_rack_id
    ) VALUES (
      NEW.rack_id, NEW.id, NEW.name, 
      CASE WHEN OLD.rack_id IS NOT NULL AND OLD.rack_id != NEW.rack_id THEN 'moved' ELSE 'installed' END,
      NEW.position_u_start, COALESCE(NEW.position_u_end, NEW.position_u_start), 
      COALESCE(NEW.mount_side, 'front'),
      CASE WHEN OLD.rack_id != NEW.rack_id THEN OLD.rack_id ELSE NULL END
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar triggers
CREATE TRIGGER equipment_install_history_trigger
AFTER INSERT ON public.equipment
FOR EACH ROW EXECUTE FUNCTION public.log_equipment_install();

CREATE TRIGGER equipment_change_history_trigger
AFTER UPDATE ON public.equipment
FOR EACH ROW
WHEN (OLD.rack_id IS DISTINCT FROM NEW.rack_id OR 
      OLD.position_u_start IS DISTINCT FROM NEW.position_u_start OR
      OLD.position_u_end IS DISTINCT FROM NEW.position_u_end)
EXECUTE FUNCTION public.log_equipment_change();

-- Habilitar RLS
ALTER TABLE public.rack_occupancy_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Anyone authenticated can view rack history"
ON public.rack_occupancy_history FOR SELECT
USING (true);

CREATE POLICY "System can insert rack history"
ON public.rack_occupancy_history FOR INSERT
WITH CHECK (true);
