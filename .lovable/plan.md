

# Visualização Kanban para Chamados

## Situação Atual

A página de Chamados (`SupportTickets.tsx`) possui apenas visualização em **lista/tabela**. Já usa `Tabs` para alternar entre "Chamados" e "Categorias" (admin). Os status existentes são: `open`, `in_progress`, `resolved`, `closed`.

O hook `useTickets` já expõe `updateTicket` para alterar status.

## Proposta

Adicionar um toggle **Lista / Kanban** dentro da aba "Chamados", sem alterar a estrutura de abas existente.

### Kanban Board

4 colunas correspondendo aos status:

```text
┌──────────┐  ┌─────────────┐  ┌───────────┐  ┌──────────┐
│  Aberto  │  │ Em Andamento│  │ Resolvido │  │ Fechado  │
│ (open)   │  │(in_progress)│  │(resolved) │  │ (closed) │
├──────────┤  ├─────────────┤  ├───────────┤  ├──────────┤
│ Card     │  │ Card        │  │ Card      │  │ Card     │
│ Card     │  │             │  │           │  │          │
└──────────┘  └─────────────┘  └───────────┘  └──────────┘
```

Cada **card** mostra: número do ticket, título (truncado), badge de prioridade, badge de categoria, avatar do atribuído, e data.

**Drag & Drop**: Arrastar um card entre colunas atualiza o status via `updateTicket`. Usar HTML5 drag-and-drop nativo (sem lib externa) para manter leve.

### Arquivos

| Arquivo | Alteração |
|---------|-----------|
| `src/components/tickets/TicketKanbanBoard.tsx` | **Novo** — Componente Kanban com colunas e cards arrastáveis |
| `src/pages/SupportTickets.tsx` | Adicionar toggle Lista/Kanban + renderizar condicionalmente |

### Detalhes Técnicos

1. **`TicketKanbanBoard.tsx`**
   - Recebe `tickets` (filtrados), `onStatusChange(ticketId, newStatus)`, `onTicketClick(id)`
   - 4 colunas com header colorido (azul/amarelo/verde/cinza)
   - Cards com `draggable`, usando `onDragStart`/`onDragOver`/`onDrop`
   - Contagem de tickets por coluna no header
   - Indicador visual de drop zone ao arrastar

2. **`SupportTickets.tsx`**
   - Novo state: `viewMode: 'list' | 'kanban'`
   - Toggle com ícones `List` e `LayoutGrid` acima dos filtros
   - Renderiza `Table` ou `TicketKanbanBoard` conforme o modo
   - Os filtros (busca, prioridade, categoria, etc.) aplicam-se igualmente ao Kanban
   - Ao dropar, chama `updateTicket({ id, status: newStatus })`

