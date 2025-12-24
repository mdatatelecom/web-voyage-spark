# 🚀 Guia Completo de Migração para VPS

## Visão Geral

Este guia documenta a migração completa do sistema de gerenciamento de infraestrutura de datacenter para uma VPS própria com backend Node.js.

## 📊 Análise do Sistema Atual

### Tecnologias

| Componente | Atual | Migração |
|------------|-------|----------|
| **Frontend** | React 18 + Vite + TypeScript + Tailwind | Mesmo (build estático) |
| **Backend** | Supabase Edge Functions (Deno) | Node.js + Express |
| **Banco de Dados** | PostgreSQL (Supabase) | PostgreSQL (self-hosted) |
| **Autenticação** | Supabase Auth | JWT + bcrypt |
| **Storage** | Supabase Storage | MinIO ou Sistema de arquivos |
| **Realtime** | Supabase Realtime | Socket.IO |

### Edge Functions a Migrar

| Função | Descrição | Linhas | Complexidade |
|--------|-----------|--------|--------------|
| `send-whatsapp` | Integração Evolution API | ~1540 | Alta |
| `whatsapp-webhook` | Webhook WhatsApp | ~3105 | Alta |
| `admin-create-user` | Criação de usuários | ~195 | Média |
| `admin-list-users` | Listagem de usuários | ~100 | Baixa |
| `admin-find-user-by-email` | Busca por email | ~80 | Baixa |
| `check-capacity-alerts` | Verificação de alertas | ~436 | Média |
| `send-alert-email` | Envio de emails (Resend) | ~140 | Média |
| `terminal-proxy` | Proxy SSH WebSocket | ~467 | Alta |
| `test-connection` | Teste de conexão | ~50 | Baixa |

### Tabelas do Banco de Dados

| Tabela | Descrição |
|--------|-----------|
| `access_logs` | Logs de acesso |
| `alert_settings` | Configurações de alertas |
| `alerts` | Alertas do sistema |
| `buildings` | Prédios/Locais |
| `connections` | Conexões de rede |
| `equipment` | Equipamentos |
| `floors` | Andares |
| `labels` | Etiquetas QR |
| `notification_settings` | Configurações de notificação |
| `ports` | Portas de equipamentos |
| `profiles` | Perfis de usuários |
| `rack_annotations` | Anotações em racks |
| `racks` | Racks |
| `rooms` | Salas |
| `support_tickets` | Chamados de suporte |
| `system_settings` | Configurações do sistema |
| `ticket_comments` | Comentários em tickets |
| `user_roles` | Papéis de usuários |
| `whatsapp_*` | Tabelas WhatsApp |

### Integrações Externas

- **Evolution API** (WhatsApp)
- **Resend** (Email)
- **ViaCEP** (CEP Brasileiro)

---

## 📁 Estrutura de Pastas na VPS

```
/opt/datacenter-app/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts
│   │   │   ├── auth.ts
│   │   │   └── storage.ts
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── buildings.controller.ts
│   │   │   ├── equipment.controller.ts
│   │   │   ├── racks.controller.ts
│   │   │   ├── connections.controller.ts
│   │   │   ├── tickets.controller.ts
│   │   │   ├── whatsapp.controller.ts
│   │   │   ├── alerts.controller.ts
│   │   │   └── terminal.controller.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── role.middleware.ts
│   │   │   ├── cors.middleware.ts
│   │   │   └── logger.middleware.ts
│   │   ├── routes/
│   │   │   └── index.ts
│   │   ├── services/
│   │   │   ├── whatsapp.service.ts
│   │   │   ├── email.service.ts
│   │   │   └── storage.service.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   └── helpers.ts
│   │   └── index.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── dist/              # Build do React
│   ├── Dockerfile
│   └── nginx.conf
├── database/
│   ├── init/
│   │   ├── 01-schema.sql
│   │   ├── 02-enums.sql
│   │   ├── 03-tables.sql
│   │   ├── 04-views.sql
│   │   ├── 05-functions.sql
│   │   ├── 06-triggers.sql
│   │   └── 07-seed.sql
│   ├── migrations/
│   └── backup/
├── nginx/
│   ├── nginx.conf
│   └── ssl/
├── scripts/
│   ├── deploy.sh
│   ├── backup.sh
│   ├── restore.sh
│   └── update.sh
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
└── README.md
```

---

## 🔧 Requisitos da VPS

### Hardware Mínimo

- **CPU**: 2 vCPUs
- **RAM**: 4 GB
- **Disco**: 40 GB SSD
- **Banda**: 1 TB/mês

### Hardware Recomendado

- **CPU**: 4 vCPUs
- **RAM**: 8 GB
- **Disco**: 80 GB SSD
- **Banda**: Unlimited

### Software

- Ubuntu Server 22.04 LTS ou 24.04 LTS
- Docker 24+
- Docker Compose 2.20+
- Git

---

## 📝 Checklist de Migração

### Fase 1: Preparação da VPS
- [ ] Provisionar VPS
- [ ] Configurar DNS do domínio
- [ ] Atualizar sistema operacional
- [ ] Instalar Docker e Docker Compose
- [ ] Configurar firewall (UFW)
- [ ] Configurar SSH (desabilitar root, usar chave)

### Fase 2: Banco de Dados
- [ ] Exportar dados do Supabase
- [ ] Criar schema PostgreSQL
- [ ] Importar dados
- [ ] Verificar integridade
- [ ] Configurar backups automáticos

### Fase 3: Backend
- [ ] Configurar variáveis de ambiente
- [ ] Build da imagem Docker
- [ ] Testar endpoints
- [ ] Configurar PM2 ou systemd (se sem Docker)

### Fase 4: Frontend
- [ ] Ajustar URLs de API
- [ ] Build de produção
- [ ] Configurar Nginx
- [ ] Testar rotas

### Fase 5: SSL e Domínio
- [ ] Apontar domínio para VPS
- [ ] Configurar Let's Encrypt
- [ ] Testar HTTPS
- [ ] Configurar renovação automática

### Fase 6: Go Live
- [ ] Deploy final
- [ ] Testes de integração
- [ ] Monitoramento
- [ ] Documentar procedimentos

---

## 📚 Próximos Passos

1. [Configuração da VPS](./01-vps-setup.md)
2. [Migração do Banco de Dados](./02-database-migration.md)
3. [Backend Node.js](./03-backend-setup.md)
4. [Frontend e Nginx](./04-frontend-nginx.md)
5. [Docker e Deploy](./05-docker-deploy.md)
6. [Operação e Manutenção](./06-operations.md)
