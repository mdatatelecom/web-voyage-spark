-- Criar tabela para conteúdo da landing page
CREATE TABLE public.landing_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_key VARCHAR(100) UNIQUE NOT NULL,
  content_type VARCHAR(50) NOT NULL, -- 'text', 'feature', 'highlight'
  title VARCHAR(255),
  description TEXT,
  icon VARCHAR(50),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.landing_content ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Leitura pública de landing_content" 
ON public.landing_content 
FOR SELECT 
USING (true);

CREATE POLICY "Admins podem gerenciar landing_content" 
ON public.landing_content 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

-- Trigger para updated_at
CREATE TRIGGER update_landing_content_updated_at
BEFORE UPDATE ON public.landing_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir textos principais
INSERT INTO public.landing_content (content_key, content_type, title, description, display_order) VALUES
('hero_description', 'text', NULL, 'Mapa Digital da Infraestrutura de Rede Física e CFTV. Rastreamento completo de cabos, portas, conexões e pontos de CFTV com identificação segura via QR Code.', 0),
('screenshots_title', 'text', 'Conheça a Plataforma', 'Interface moderna e intuitiva para gestão completa da sua infraestrutura', 0),
('highlights_subtitle', 'text', 'Plataforma Completa', NULL, 0),
('highlights_title', 'text', 'Mapa Operacional da Infraestrutura', 'Solução completa para gestão de datacenter, cabeamento estruturado, OAM, controle de IPs e monitoramento de rede e CFTV em uma única plataforma.', 0);

-- Inserir features
INSERT INTO public.landing_content (content_key, content_type, title, description, icon, display_order) VALUES
('feature_1', 'feature', 'Rastreamento Inteligente', 'Geração automática de QR codes para identificação rápida de pontos de rede e CFTV. Escaneie e obtenha todas as informações instantaneamente.', 'Cable', 1),
('feature_2', 'feature', 'Inventário Completo', 'Cadastro hierárquico de prédios, andares, salas e racks. Visualização 3D de equipamentos com posicionamento preciso em unidades de rack.', 'Server', 2),
('feature_3', 'feature', 'Plantas Interativas', 'Upload de plantas baixas com posicionamento de racks e câmeras. Ferramenta de medição integrada e visualização de conexões em tempo real.', 'Map', 3),
('feature_4', 'feature', 'Topologia de Rede', 'Visualização gráfica da topologia com mapa de conexões. Identificação de VLANs, tipos de cabo e rastreamento completo do caminho de rede.', 'Network', 4),
('feature_5', 'feature', 'Monitoramento Visual', 'Visualização ao vivo de câmeras CFTV integradas. Relatórios de canais NVR, controle de thumbnails e gerenciamento de gravações.', 'Camera', 5),
('feature_6', 'feature', 'Gestão de Tickets', 'Sistema completo de chamados com SLA, prioridades e categorização. Integração com WhatsApp para notificações e atualização de status.', 'Headset', 6);

-- Inserir highlights
INSERT INTO public.landing_content (content_key, content_type, title, display_order) VALUES
('highlight_1', 'highlight', 'Tempo Real', 1),
('highlight_2', 'highlight', 'IPAM Integrado', 2),
('highlight_3', 'highlight', 'Relatórios PDF', 3),
('highlight_4', 'highlight', 'Multi-usuário', 4),
('highlight_5', 'highlight', 'Visualização 3D', 5),
('highlight_6', 'highlight', 'Gestão de VLANs', 6),
('highlight_7', 'highlight', 'Alertas Inteligentes', 7),
('highlight_8', 'highlight', 'Histórico Completo', 8);