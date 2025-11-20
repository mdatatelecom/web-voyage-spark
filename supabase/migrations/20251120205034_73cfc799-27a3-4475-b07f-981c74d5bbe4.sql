-- Criar tabela de configurações do sistema
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  updated_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Policies - Apenas admins podem gerenciar
CREATE POLICY "Admins can view system settings"
  ON public.system_settings
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can manage system settings"
  ON public.system_settings
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Inserir configurações padrão
INSERT INTO public.system_settings (setting_key, setting_value) VALUES
  ('branding', '{"systemName": "InfraConnexus", "logoUrl": null, "faviconUrl": null}'::jsonb),
  ('theme_colors', '{
    "primary": "222.2 47.4% 11.2%",
    "primaryForeground": "210 40% 98%",
    "secondary": "210 40% 96.1%",
    "secondaryForeground": "222.2 47.4% 11.2%",
    "accent": "210 40% 96.1%",
    "accentForeground": "222.2 47.4% 11.2%",
    "sidebarBackground": "0 0% 98%",
    "sidebarForeground": "240 5.3% 26.1%",
    "sidebarPrimary": "240 5.9% 10%",
    "sidebarAccent": "240 4.8% 95.9%",
    "sidebarAccentForeground": "240 5.9% 10%",
    "sidebarBorder": "220 13% 91%"
  }'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- Criar bucket público para branding se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('public', 'public', true)
ON CONFLICT (id) DO NOTHING;

-- Permitir admins fazerem upload de branding
CREATE POLICY "Admins can upload branding images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'public' 
  AND (storage.foldername(name))[1] = 'branding'
  AND has_role(auth.uid(), 'admin'::user_role)
);

-- Permitir visualização pública das imagens de branding
CREATE POLICY "Public branding images are viewable"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'public' AND (storage.foldername(name))[1] = 'branding');