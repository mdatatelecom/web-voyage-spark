-- Criar bucket público para assets da landing page
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'landing-assets', 
  'landing-assets', 
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
);

-- Política de leitura pública (qualquer pessoa pode ver)
CREATE POLICY "Acesso público de leitura para landing-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'landing-assets');

-- Política de upload apenas para usuários autenticados
CREATE POLICY "Upload autenticado em landing-assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'landing-assets' 
  AND auth.role() = 'authenticated'
);

-- Política de delete para usuários autenticados
CREATE POLICY "Delete autenticado em landing-assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'landing-assets' 
  AND auth.role() = 'authenticated'
);

-- Política de update para usuários autenticados
CREATE POLICY "Update autenticado em landing-assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'landing-assets' 
  AND auth.role() = 'authenticated'
);

-- Criar tabela para gerenciar screenshots da landing page
CREATE TABLE public.landing_screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_landing_screenshots_updated_at
  BEFORE UPDATE ON public.landing_screenshots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.landing_screenshots ENABLE ROW LEVEL SECURITY;

-- Leitura pública (para landing page)
CREATE POLICY "Leitura pública de screenshots"
ON public.landing_screenshots FOR SELECT
USING (true);

-- Insert apenas para admins
CREATE POLICY "Admins podem inserir screenshots"
ON public.landing_screenshots FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role));

-- Update apenas para admins
CREATE POLICY "Admins podem atualizar screenshots"
ON public.landing_screenshots FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::user_role));

-- Delete apenas para admins
CREATE POLICY "Admins podem deletar screenshots"
ON public.landing_screenshots FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::user_role));