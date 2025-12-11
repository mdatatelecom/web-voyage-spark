-- Adicionar novos campos à tabela equipment inspirados no NetBox

-- Campo para tag de patrimônio/ativo
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS asset_tag TEXT;

-- Campo para status do equipamento
DO $$ BEGIN
  CREATE TYPE equipment_status AS ENUM (
    'active', 
    'planned', 
    'offline', 
    'staged', 
    'failed', 
    'decommissioning'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE equipment ADD COLUMN IF NOT EXISTS equipment_status TEXT DEFAULT 'active';

-- Campo para configuração de airflow
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS airflow TEXT;

-- Campo para peso em kg
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS weight_kg NUMERIC;

-- Campo para consumo de energia em watts
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS power_consumption_watts INTEGER;

-- Campo para endereço MAC principal
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS primary_mac_address TEXT;

-- Índice para asset_tag (busca por patrimônio)
CREATE INDEX IF NOT EXISTS idx_equipment_asset_tag ON equipment(asset_tag) WHERE asset_tag IS NOT NULL;

-- Índice para status
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(equipment_status);