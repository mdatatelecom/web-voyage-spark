-- Adicionar novos tipos de cabo para CFTV analógico
ALTER TYPE cable_type ADD VALUE IF NOT EXISTS 'coaxial_rg59';
ALTER TYPE cable_type ADD VALUE IF NOT EXISTS 'coaxial_rg6';
ALTER TYPE cable_type ADD VALUE IF NOT EXISTS 'utp_balun';