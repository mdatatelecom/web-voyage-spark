UPDATE public.system_settings
SET setting_value = jsonb_set(setting_value, '{systemName}', '"IW Telecom"'::jsonb)
WHERE setting_key = 'branding';

INSERT INTO public.system_settings (setting_key, setting_value)
SELECT 'branding', '{"systemName":"IW Telecom","logoUrl":null,"faviconUrl":null}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.system_settings WHERE setting_key = 'branding');