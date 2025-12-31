-- Add knowledge about WhatsApp bot commands for the AI chat
INSERT INTO system_knowledge (category, topic, content, keywords) VALUES
('whatsapp', 'Menu Principal do Bot', 
'O bot WhatsApp mostra um menu de boas-vindas quando o usuário envia saudações como "oi", "olá", "menu", "bom dia", "boa tarde" ou "boa noite". O menu exibe todas as funcionalidades disponíveis: consultas de chamados, criação de chamados, alteração de status (técnicos), atribuição (técnicos), estatísticas, anexar arquivos, prioridade e infraestrutura.', 
ARRAY['whatsapp', 'menu', 'boas-vindas', 'oi', 'olá']),

('whatsapp', 'Comandos de Chamados via WhatsApp', 
'Pelo WhatsApp você pode gerenciar chamados: "meus chamados" lista seus tickets, "status XXXXX" mostra status de um ticket (use número curto como 00001), "detalhes XXXXX" mostra detalhes completos. Para criar: "criar chamado" inicia wizard guiado, "novo" mostra categorias, "novo manutenção" cria com categoria específica. Para anexar arquivos, envie foto/documento com legenda "anexar XXXXX".', 
ARRAY['whatsapp', 'chamado', 'ticket', 'criar', 'status', 'anexar', 'meus chamados']),

('whatsapp', 'Comandos de Técnico via WhatsApp',
'Técnicos podem via WhatsApp: "atribuir XXXXX" ou "assumir XXXXX" para assumir um chamado, "transferir XXXXX [telefone]" para transferir, "cancelar XXXXX" para remover atribuição. Para alterar status: "iniciar XXXXX" (em andamento), "resolver XXXXX" (resolvido com confirmação), "encerrar XXXXX" (fechado com confirmação), "reabrir XXXXX". Estatísticas: "minhas estatisticas" mostra desempenho, "meus resolvidos" lista histórico. "disponiveis" lista chamados sem técnico.', 
ARRAY['whatsapp', 'técnico', 'atribuir', 'transferir', 'resolver', 'estatísticas', 'disponiveis']),

('whatsapp', 'Comandos de Infraestrutura via WhatsApp',
'Consultas de infraestrutura pelo WhatsApp: "racks" lista todos os racks, "rack [nome]" mostra detalhes e equipamentos, "ocupacao [nome]" mostra ocupação visual. "plantas" lista plantas baixas, "planta [nome]" envia imagem da planta, "plantas [prédio]" filtra por prédio. "cameras" lista câmeras IP, "camera [nome]" mostra detalhes. "nvrs" lista NVRs/DVRs, "nvr [nome]" mostra detalhes e câmeras conectadas. "localizar [termo]" faz busca universal em toda infraestrutura.', 
ARRAY['whatsapp', 'racks', 'plantas', 'cameras', 'nvrs', 'infraestrutura', 'localizar']),

('whatsapp', 'Submenus de Ajuda do Bot',
'O bot possui submenus de ajuda organizados por categoria: "ajuda" mostra menu principal de ajuda, "ajuda chamados" mostra comandos de consulta e criação de chamados, "ajuda tecnico" mostra comandos para técnicos (atribuição, status, estatísticas), "ajuda infra" mostra comandos de infraestrutura (racks, plantas, câmeras, NVRs), "ajuda status" mostra consultas rápidas de status.', 
ARRAY['whatsapp', 'ajuda', 'help', 'comandos']),

('whatsapp', 'Histórico de Interações WhatsApp',
'O sistema registra todas as interações do bot WhatsApp na página "WhatsApp → Histórico". A aba "Interações" mostra estatísticas (total, sucesso, erros, tempo médio de processamento), gráficos de distribuição por hora e dia da semana, comandos mais usados, e tabela detalhada com paginação. Você pode filtrar por data, comando e telefone.', 
ARRAY['whatsapp', 'interações', 'histórico', 'estatísticas', 'gráficos'])

ON CONFLICT DO NOTHING;