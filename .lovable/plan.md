

# Categorias e Subcategorias Dinâmicas para Chamados

## Objetivo
Migrar as categorias de chamados de constantes hardcoded (`src/constants/ticketTypes.ts`) para tabelas no banco de dados, permitindo criar/editar/excluir categorias e subcategorias via interface administrativa.

## Banco de Dados

### Novas tabelas

**`ticket_categories`**
- `id` (uuid, PK)
- `name` (text) - ex: "Hardware"
- `slug` (text, unique) - ex: "hardware" (para compatibilidade com dados existentes)
- `color` (text) - ex: "#3b82f6"
- `icon` (text, nullable) - emoji ou nome de icone
- `display_order` (integer, default 0)
- `is_active` (boolean, default true)
- `created_at`, `updated_at`

**`ticket_subcategories`**
- `id` (uuid, PK)
- `category_id` (uuid, FK -> ticket_categories)
- `name` (text) - ex: "Impressora"
- `slug` (text)
- `display_order` (integer, default 0)
- `is_active` (boolean, default true)
- `created_at`, `updated_at`

**Migração de dados**: INSERT das 7 categorias existentes (hardware, software, network, access, maintenance, installation, other) com seus slugs.

**Coluna nova em `support_tickets`**: `subcategory_id` (uuid, nullable, FK -> ticket_subcategories).

**RLS**: Todos autenticados podem ler. Apenas admins podem criar/editar/deletar.

## Frontend

### 1. Hook `useTicketCategories`
- Busca categorias e subcategorias do banco
- Mutations para CRUD
- Exporta `getCategoryLabel` e `getSubcategoryLabel` dinâmicos

### 2. Página de Gestão (nova aba em Chamados ou seção em System)
- Acessível apenas para admins
- Lista categorias com drag-to-reorder ou setas de ordenação
- Botao para criar categoria (nome, cor, icone)
- Expandir categoria para ver/criar subcategorias
- Editar/desativar categorias e subcategorias

### 3. Atualizar dependências
- **`TicketCreateDialog`**: Usar categorias do banco + selector de subcategoria condicional
- **`SupportTickets.tsx`**: Filtro de categoria dinâmico do banco
- **`TicketDetails.tsx`**: Exibir subcategoria se presente
- **`TicketMetrics / charts`**: Adaptar labels dinâmicos
- **`useTicketStats.ts`**: Usar labels do banco
- **`ticketTypes.ts`**: Manter prioridades/status hardcoded, remover categorias hardcoded (substituir por fallback ao hook)
- **`whatsapp-webhook`**: Buscar categorias do banco ao invés de array hardcoded
- **`backend webhook.controller.ts`**: Buscar categorias do banco

## Resumo de arquivos

| Arquivo | Alteracao |
|---------|----------|
| Migration SQL | Criar tabelas + seed + alter support_tickets |
| `src/hooks/useTicketCategories.ts` | Novo hook CRUD |
| `src/components/tickets/TicketCategoryManager.tsx` | Nova UI de gestao |
| `src/pages/SupportTickets.tsx` | Filtro dinamico |
| `src/components/tickets/TicketCreateDialog.tsx` | Categorias + subcategorias do banco |
| `src/pages/TicketDetails.tsx` | Exibir subcategoria |
| `src/constants/ticketTypes.ts` | Remover TICKET_CATEGORIES, manter prioridades/status |
| `src/hooks/useTicketStats.ts` | Labels dinamicos |
| `supabase/functions/whatsapp-webhook/index.ts` | Buscar categorias do banco |
| `backend/src/controllers/webhook.controller.ts` | Buscar categorias do banco |

