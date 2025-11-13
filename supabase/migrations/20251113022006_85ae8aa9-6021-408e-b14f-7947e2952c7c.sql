-- Atribuir role de admin ao usuário marcosasmuniz@hotmail.com
INSERT INTO public.user_roles (user_id, role, assigned_by)
VALUES (
  '1f1e476c-e0f5-4f59-be59-6bd43a9c4b31',
  'admin',
  '1f1e476c-e0f5-4f59-be59-6bd43a9c4b31'
)
ON CONFLICT (user_id, role) DO NOTHING;