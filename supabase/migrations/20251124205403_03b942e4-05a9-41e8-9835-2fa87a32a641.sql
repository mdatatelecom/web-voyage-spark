-- Expandir tabela buildings com novos campos de localização
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS building_type text;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS internal_code text;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS zip_code text;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS latitude decimal(10, 8);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS longitude decimal(11, 8);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS contact_name text;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS contact_email text;

-- Expandir tabela floors com novos campos
ALTER TABLE floors ADD COLUMN IF NOT EXISTS area_sqm decimal(10, 2);
ALTER TABLE floors ADD COLUMN IF NOT EXISTS has_access_control boolean DEFAULT false;

-- Expandir tabela rooms com novos campos
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS capacity integer;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS has_access_control boolean DEFAULT false;

-- Adicionar índices para melhorar performance de queries
CREATE INDEX IF NOT EXISTS idx_buildings_type ON buildings(building_type);
CREATE INDEX IF NOT EXISTS idx_buildings_city ON buildings(city);
CREATE INDEX IF NOT EXISTS idx_buildings_state ON buildings(state);
CREATE INDEX IF NOT EXISTS idx_buildings_internal_code ON buildings(internal_code);
CREATE INDEX IF NOT EXISTS idx_rooms_type ON rooms(room_type);
CREATE INDEX IF NOT EXISTS idx_rooms_access_control ON rooms(has_access_control);
CREATE INDEX IF NOT EXISTS idx_floors_access_control ON floors(has_access_control);