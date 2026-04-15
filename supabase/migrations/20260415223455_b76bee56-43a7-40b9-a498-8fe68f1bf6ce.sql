
-- Create ticket_categories table
CREATE TABLE public.ticket_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#6b7280',
  icon text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create ticket_subcategories table
CREATE TABLE public.ticket_subcategories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid NOT NULL REFERENCES public.ticket_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(category_id, slug)
);

-- Add subcategory_id to support_tickets
ALTER TABLE public.support_tickets
  ADD COLUMN subcategory_id uuid REFERENCES public.ticket_subcategories(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.ticket_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_subcategories ENABLE ROW LEVEL SECURITY;

-- RLS for ticket_categories
CREATE POLICY "Anyone authenticated can view categories"
  ON public.ticket_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert categories"
  ON public.ticket_categories FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Only admins can update categories"
  ON public.ticket_categories FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Only admins can delete categories"
  ON public.ticket_categories FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role));

-- RLS for ticket_subcategories
CREATE POLICY "Anyone authenticated can view subcategories"
  ON public.ticket_subcategories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert subcategories"
  ON public.ticket_subcategories FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Only admins can update subcategories"
  ON public.ticket_subcategories FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Only admins can delete subcategories"
  ON public.ticket_subcategories FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Triggers for updated_at
CREATE TRIGGER update_ticket_categories_updated_at
  BEFORE UPDATE ON public.ticket_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ticket_subcategories_updated_at
  BEFORE UPDATE ON public.ticket_subcategories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed existing categories
INSERT INTO public.ticket_categories (name, slug, color, icon, display_order) VALUES
  ('Hardware', 'hardware', '#3b82f6', '🖥️', 1),
  ('Software', 'software', '#8b5cf6', '💿', 2),
  ('Rede', 'network', '#10b981', '🌐', 3),
  ('Acesso', 'access', '#eab308', '🔐', 4),
  ('Manutenção', 'maintenance', '#f97316', '🔧', 5),
  ('Instalação', 'installation', '#06b6d4', '📦', 6),
  ('Outros', 'other', '#6b7280', '📋', 7);
