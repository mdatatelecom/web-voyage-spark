-- Tabela de conhecimento do sistema (para aprendizado contínuo)
CREATE TABLE public.system_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  keywords TEXT[],
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- Tabela de histórico de chat
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_id UUID NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para busca
CREATE INDEX idx_knowledge_category ON public.system_knowledge(category);
CREATE INDEX idx_knowledge_keywords ON public.system_knowledge USING GIN(keywords);
CREATE INDEX idx_chat_messages_session ON public.chat_messages(session_id);
CREATE INDEX idx_chat_messages_user ON public.chat_messages(user_id);

-- RLS Policies
ALTER TABLE public.system_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read knowledge" ON public.system_knowledge
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage knowledge" ON public.system_knowledge
  FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Users can read own chat history" ON public.chat_messages
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own messages" ON public.chat_messages
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Trigger para updated_at
CREATE TRIGGER update_system_knowledge_updated_at
  BEFORE UPDATE ON public.system_knowledge
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Popular base de conhecimento inicial
INSERT INTO public.system_knowledge (category, topic, content, keywords) VALUES
-- Funcionamento Geral
('funcionamento', 'Visão Geral', 'O sistema é uma plataforma de gerenciamento de infraestrutura de datacenter que permite gerenciar prédios, andares, salas, racks, equipamentos e conexões de rede. Inclui módulos de CFTV, alertas automáticos, chamados de suporte e integração com WhatsApp.', 
 ARRAY['sistema', 'datacenter', 'infraestrutura', 'gerenciamento']),

('funcionamento', 'Hierarquia de Locais', 'A estrutura segue: Prédios → Andares → Salas → Racks → Equipamentos. Cada prédio pode ter múltiplos andares, cada andar pode ter múltiplas salas, e cada sala pode ter múltiplos racks.',
 ARRAY['prédio', 'andar', 'sala', 'rack', 'hierarquia', 'estrutura']),

('funcionamento', 'Navegação', 'O menu lateral contém: Dashboard, Prédios, Andares, Salas, Racks, Equipamentos, Conexões, Mapa de Rede, Alertas, Chamados, Etiquetas, Métricas de Chamados, Mapa de Câmeras, Relatório NVR, Análise de QR, Auditoria e Configurações.',
 ARRAY['menu', 'navegação', 'páginas', 'funcionalidades']),

-- Alertas
('alertas', 'Tipos de Alerta', 'O sistema gera alertas automáticos para: ocupação de rack (rack_capacity), uso de portas (port_capacity), consumo PoE (poe_capacity), NVR/DVR cheio (nvr_full), câmeras sem NVR (camera_unassigned), conexões com defeito (connection_faulty), conexões em testing prolongado (connection_stale_testing), e equipamentos sem IP (equipment_no_ip).',
 ARRAY['alerta', 'notificação', 'rack', 'poe', 'nvr', 'câmera', 'conexão', 'tipos']),

('alertas', 'Severidades', 'Alertas têm três níveis de severidade: Info (azul, informativo), Warning (amarelo, atenção), Critical (vermelho, urgente). Alertas críticos são enviados por email e WhatsApp automaticamente.',
 ARRAY['severidade', 'crítico', 'warning', 'info', 'prioridade', 'níveis']),

('alertas', 'Auto-Resolução', 'Alertas são automaticamente resolvidos quando o problema é corrigido. Por exemplo: quando uma câmera é conectada a um NVR, o alerta de "câmera sem NVR" é fechado automaticamente. Quando um equipamento recebe um IP, o alerta de "equipamento sem IP" é resolvido.',
 ARRAY['auto-resolução', 'resolver', 'automático', 'fechar']),

('alertas', 'Configuração de Thresholds', 'Os thresholds de alerta podem ser configurados em Configurações → Alertas. Configurações disponíveis: limite de ocupação de rack (%), limite de uso de portas (%), limite de consumo PoE (%), limite de ocupação NVR (%), dias em testing antes de alerta.',
 ARRAY['threshold', 'limite', 'configuração', 'percentual', 'dias']),

('alertas', 'Notificações', 'Alertas podem ser notificados por Email e WhatsApp. Para configurar, acesse Configurações → Notificações. É possível escolher quais severidades geram notificação em cada canal.',
 ARRAY['notificação', 'email', 'whatsapp', 'envio', 'configurar']),

-- Chamados
('chamados', 'Criação de Chamados', 'Chamados podem ser criados pela interface web em Chamados → Novo Chamado, ou via WhatsApp usando o comando "novo" ou "criar chamado". Cada chamado tem: título, descrição, categoria, prioridade, e pode ter anexos e associação com equipamentos/racks/salas.',
 ARRAY['chamado', 'ticket', 'suporte', 'criar', 'novo', 'abrir']),

('chamados', 'Status de Chamados', 'Os status são: Aberto (open - novo chamado), Em Andamento (in_progress - sendo trabalhado), Resolvido (resolved - solução aplicada aguardando confirmação), e Fechado (closed - concluído).',
 ARRAY['status', 'aberto', 'andamento', 'resolvido', 'fechado', 'estado']),

('chamados', 'Prioridades', 'As prioridades são: Baixa (low), Média (medium), Alta (high), Urgente (urgent). Prioridade urgente gera notificações imediatas por WhatsApp.',
 ARRAY['prioridade', 'baixa', 'média', 'alta', 'urgente', 'importância']),

('chamados', 'Categorias', 'Categorias disponíveis: Falha de Hardware, Problema de Rede, Manutenção Preventiva, Instalação, Configuração, Cabeamento, CFTV, Energia, Climatização, Acesso, Outros.',
 ARRAY['categoria', 'tipo', 'classificação', 'hardware', 'rede', 'manutenção']),

('chamados', 'Comentários', 'É possível adicionar comentários aos chamados pela web ou WhatsApp. Comentários podem ser internos (apenas para equipe técnica) ou públicos.',
 ARRAY['comentário', 'mensagem', 'resposta', 'interno', 'público']),

('chamados', 'Atribuição', 'Chamados podem ser atribuídos a técnicos específicos. Para atribuir, edite o chamado e selecione o técnico no campo "Atribuído a".',
 ARRAY['atribuir', 'técnico', 'responsável', 'designar']),

-- Equipamentos
('equipamentos', 'Tipos de Equipamentos', 'O sistema suporta diversos tipos: Servidores (server), Switches (switch), Switches PoE (switch_poe), Roteadores (router), Firewalls (firewall), Patch Panels (patch_panel, patch_panel_fiber), PDUs (pdu, pdu_smart), NVRs (nvr), DVRs (dvr), Câmeras IP (ip_camera), Access Points (access_point), UPS (ups), Storage (storage), KVM (kvm), Media Converters (media_converter), Sensores Ambientais (environment_sensor), entre outros.',
 ARRAY['equipamento', 'servidor', 'switch', 'roteador', 'firewall', 'nvr', 'câmera', 'tipos']),

('equipamentos', 'Cadastro de Equipamento', 'Para cadastrar um equipamento: acesse Equipamentos → Novo, preencha nome, tipo, fabricante, modelo, número de série, rack de instalação, posição U inicial e final, e informações de rede (IP, hostname, MAC).',
 ARRAY['cadastrar', 'novo', 'adicionar', 'registrar', 'equipamento']),

('equipamentos', 'PoE Budget', 'Switches PoE têm um budget de potência em Watts. O sistema calcula o consumo baseado nos dispositivos conectados (câmeras, APs, etc.) e gera alertas quando o consumo está próximo do limite. Configure o budget em cada switch PoE.',
 ARRAY['poe', 'budget', 'watts', 'consumo', 'energia', 'potência']),

('equipamentos', 'Portas', 'Cada equipamento pode ter múltiplas portas. Tipos de porta: RJ45, RJ45 PoE, RJ45 PoE+, RJ45 PoE++, SFP, SFP+, SFP28, QSFP, Fibra LC, Fibra SC, Console, USB, Serial, entre outros.',
 ARRAY['porta', 'interface', 'rj45', 'sfp', 'fibra', 'conexão']),

('equipamentos', 'Status do Equipamento', 'Status possíveis: Ativo (active - em operação), Planejado (planned - aguardando instalação), Offline (offline - desligado), Staged (staged - preparado para deploy), Falha (failed - com problema), Em Descomissionamento (decommissioning - sendo removido).',
 ARRAY['status', 'ativo', 'offline', 'falha', 'estado']),

-- Conexões
('conexoes', 'Tipos de Cabo', 'Cabos suportados: UTP Cat5e (utp_cat5e), UTP Cat6 (utp_cat6), UTP Cat6a (utp_cat6a), Fibra OM3 (fiber_om3), Fibra OM4 (fiber_om4), Fibra OS2 (fiber_os2), DAC (dac), Outros (other).',
 ARRAY['cabo', 'utp', 'fibra', 'cat6', 'tipo', 'cabeamento']),

('conexoes', 'Status de Conexão', 'Status possíveis: Ativo (active - funcionando normalmente), Testing (testing - em teste, gera alerta após muitos dias), Inactive (inactive - desativado), Faulty (faulty - com defeito, gera alerta imediato), Reserved (reserved - reservado para uso futuro).',
 ARRAY['status', 'ativo', 'teste', 'defeito', 'faulty', 'estado']),

('conexoes', 'Criar Conexão', 'Para criar uma conexão: acesse Conexões → Nova, selecione a Porta A (origem), Porta B (destino), tipo de cabo, cor do cabo, comprimento em metros, e status inicial.',
 ARRAY['criar', 'nova', 'conexão', 'cabo', 'porta']),

('conexoes', 'VLAN', 'Conexões podem ter VLAN associada. Configure o ID da VLAN, nome da VLAN, e tipo de tagging (untagged, tagged, trunk).',
 ARRAY['vlan', 'rede', 'segmentação', 'tagged', 'trunk']),

-- WhatsApp
('whatsapp', 'Comandos WhatsApp', 'Comandos disponíveis: "ajuda" (lista comandos), "status [número]" (status do chamado), "detalhes [número]" (detalhes completos), "novo" (criar chamado), "iniciar [número]" (iniciar trabalho), "resolver [número]" (marcar resolvido), "encerrar [número]" (fechar chamado), "comentar [número] [texto]" (adicionar comentário), "meus chamados" (listar seus chamados), "disponiveis" (chamados disponíveis).',
 ARRAY['whatsapp', 'comando', 'bot', 'mensagem', 'ajuda']),

('whatsapp', 'Configuração WhatsApp', 'Para configurar o WhatsApp: acesse Configurações → WhatsApp. Configure a API URL do servidor WhatsApp, habilite/desabilite a integração, configure templates de mensagem e grupos para notificações.',
 ARRAY['whatsapp', 'configurar', 'api', 'setup', 'integração']),

('whatsapp', 'Grupos de Notificação', 'É possível configurar grupos do WhatsApp para receber notificações automáticas de novos chamados e alertas críticos.',
 ARRAY['grupo', 'whatsapp', 'notificação', 'automático']),

-- Racks
('racks', 'Visualização 3D', 'O sistema oferece visualização 3D dos racks mostrando equipamentos instalados, ocupação, e fluxo de ar. Acesse pelo botão "3D" em cada rack.',
 ARRAY['rack', '3d', 'visualização', 'ocupação', 'airflow']),

('racks', 'Ocupação de Rack', 'A ocupação do rack é calculada pela soma das unidades (U) ocupadas pelos equipamentos instalados. O sistema gera alertas quando a ocupação ultrapassa os thresholds configurados.',
 ARRAY['ocupação', 'rack', 'unidades', 'espaço', 'capacidade']),

('racks', 'Anotações', 'É possível adicionar anotações visuais aos racks para marcar manutenções planejadas, problemas, ou observações. As anotações aparecem na visualização 3D.',
 ARRAY['anotação', 'nota', 'marcação', 'rack', 'lembrete']),

-- CFTV
('cftv', 'Câmeras IP', 'Câmeras IP são cadastradas como equipamentos do tipo ip_camera. Cada câmera deve ser associada a um canal de NVR para gravação.',
 ARRAY['câmera', 'cftv', 'ip', 'vigilância', 'segurança']),

('cftv', 'NVR e DVR', 'NVRs e DVRs são equipamentos que gravam as câmeras. Cada um tem um número máximo de canais. O sistema alerta quando a ocupação de canais está alta ou quando há câmeras sem NVR.',
 ARRAY['nvr', 'dvr', 'gravador', 'canais', 'cftv']),

('cftv', 'Mapa de Câmeras', 'O Mapa de Câmeras (acessível pelo menu) exibe todas as câmeras em uma interface visual, permitindo ver status, NVR associado, e localização.',
 ARRAY['mapa', 'câmera', 'visual', 'localização', 'cftv']),

('cftv', 'Relatório NVR', 'O Relatório NVR mostra a ocupação de canais de cada NVR/DVR, câmeras associadas, e permite identificar câmeras sem gravação.',
 ARRAY['relatório', 'nvr', 'canais', 'ocupação', 'câmeras']),

-- Etiquetas e QR
('etiquetas', 'Geração de Etiquetas', 'O sistema gera etiquetas com QR Code para cada conexão. A etiqueta contém: código da conexão, equipamentos conectados, portas, tipo de cabo, e QR code para consulta rápida.',
 ARRAY['etiqueta', 'qr', 'código', 'impressão', 'label']),

('etiquetas', 'Leitura de QR', 'Use a função QR Scanner (acessível pelo menu) para ler etiquetas e ver instantaneamente os detalhes da conexão. Funciona também em dispositivos móveis.',
 ARRAY['qr', 'scanner', 'leitura', 'móvel', 'celular']),

('etiquetas', 'Análise de Scans', 'A página Análise de QR mostra estatísticas de uso do scanner: quem escaneou, quando, quais conexões foram mais consultadas.',
 ARRAY['análise', 'estatística', 'scan', 'qr', 'uso']),

-- Dashboard e Relatórios
('dashboard', 'Dashboard Principal', 'O Dashboard exibe resumo do sistema: total de equipamentos, conexões ativas, alertas pendentes, chamados abertos, ocupação de racks, e gráficos de tendência.',
 ARRAY['dashboard', 'resumo', 'visão geral', 'estatísticas', 'gráficos']),

('dashboard', 'Métricas de Chamados', 'A página Métricas de Chamados (acessível pelo menu) mostra estatísticas detalhadas: chamados por período, tempo médio de resolução, SLA, distribuição por categoria e técnico.',
 ARRAY['métricas', 'chamados', 'sla', 'tempo', 'resolução', 'estatísticas']),

('dashboard', 'Auditoria', 'A página de Auditoria mostra logs de ações no sistema: quem fez o quê e quando. Útil para rastrear mudanças e responsabilidades.',
 ARRAY['auditoria', 'log', 'histórico', 'ações', 'rastreamento']),

-- Configurações
('configuracoes', 'Configurações do Sistema', 'As configurações do sistema estão em Configurações (engrenagem no menu). Inclui: Alertas (thresholds), Notificações (email/WhatsApp), WhatsApp (API), Terminal (SSH), Cores do Sistema.',
 ARRAY['configuração', 'sistema', 'opções', 'preferências', 'setup']),

('configuracoes', 'Usuários e Permissões', 'O sistema tem 4 níveis de acesso: Admin (acesso total), Technician (gerenciar equipamentos e chamados), Viewer (apenas visualizar conexões escaneadas), Network Viewer (visualizar conexões de rede escaneadas).',
 ARRAY['usuário', 'permissão', 'acesso', 'admin', 'técnico', 'papel']),

('configuracoes', 'Terminal SSH', 'O sistema inclui terminal SSH integrado para acesso remoto a equipamentos. Configure em Configurações → Terminal as credenciais do servidor relay.',
 ARRAY['terminal', 'ssh', 'remoto', 'acesso', 'cli']);
