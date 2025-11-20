-- Garantir que theme_colors tenha TODOS os campos com valores padrão
UPDATE system_settings 
SET setting_value = jsonb_set(
  COALESCE(setting_value, '{}'::jsonb),
  '{iconColor}',
  '"222.2 47.4% 11.2%"'
)
WHERE setting_key = 'theme_colors' 
  AND (setting_value->>'iconColor') IS NULL;

-- Se não existir registro de theme_colors, criar com valores padrão completos
INSERT INTO system_settings (setting_key, setting_value, updated_at)
VALUES (
  'theme_colors',
  '{
    "primary": "222.2 47.4% 11.2%",
    "primaryForeground": "210 40% 98%",
    "secondary": "210 40% 96.1%",
    "secondaryForeground": "222.2 47.4% 11.2%",
    "accent": "210 40% 96.1%",
    "accentForeground": "222.2 47.4% 11.2%",
    "iconColor": "222.2 47.4% 11.2%",
    "sidebarBackground": "0 0% 98%",
    "sidebarForeground": "240 5.3% 26.1%",
    "sidebarPrimary": "240 5.9% 10%",
    "sidebarAccent": "240 4.8% 95.9%",
    "sidebarAccentForeground": "240 5.9% 10%",
    "sidebarBorder": "220 13% 91%"
  }'::jsonb,
  NOW()
)
ON CONFLICT (setting_key) DO NOTHING;