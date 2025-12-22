-- Adicionar coluna avatar_updated_at na tabela profiles para cache de fotos
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_updated_at TIMESTAMPTZ;