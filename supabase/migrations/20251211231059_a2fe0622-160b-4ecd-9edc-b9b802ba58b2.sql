-- Adicionar novos valores ao enum equipment_type
ALTER TYPE public.equipment_type ADD VALUE IF NOT EXISTS 'switch_poe';
ALTER TYPE public.equipment_type ADD VALUE IF NOT EXISTS 'poe_injector';
ALTER TYPE public.equipment_type ADD VALUE IF NOT EXISTS 'poe_splitter';
ALTER TYPE public.equipment_type ADD VALUE IF NOT EXISTS 'pdu_smart';
ALTER TYPE public.equipment_type ADD VALUE IF NOT EXISTS 'ip_camera';
ALTER TYPE public.equipment_type ADD VALUE IF NOT EXISTS 'media_converter';
ALTER TYPE public.equipment_type ADD VALUE IF NOT EXISTS 'media_converter_chassis';
ALTER TYPE public.equipment_type ADD VALUE IF NOT EXISTS 'environment_sensor';
ALTER TYPE public.equipment_type ADD VALUE IF NOT EXISTS 'rack_monitor';
ALTER TYPE public.equipment_type ADD VALUE IF NOT EXISTS 'dslam';
ALTER TYPE public.equipment_type ADD VALUE IF NOT EXISTS 'msan';

-- Adicionar novos valores ao enum port_type
ALTER TYPE public.port_type ADD VALUE IF NOT EXISTS 'rj45_poe';
ALTER TYPE public.port_type ADD VALUE IF NOT EXISTS 'rj45_poe_plus';
ALTER TYPE public.port_type ADD VALUE IF NOT EXISTS 'rj45_poe_plus_plus';
ALTER TYPE public.port_type ADD VALUE IF NOT EXISTS 'sensor_io';

-- Adicionar campos de PoE Budget na tabela equipment
ALTER TABLE public.equipment 
ADD COLUMN IF NOT EXISTS poe_budget_watts numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS poe_power_per_port jsonb DEFAULT NULL;

-- Comentários para documentação
COMMENT ON COLUMN public.equipment.poe_budget_watts IS 'Total PoE power budget in watts for PoE switches';
COMMENT ON COLUMN public.equipment.poe_power_per_port IS 'JSON object mapping port IDs to their power consumption in watts';