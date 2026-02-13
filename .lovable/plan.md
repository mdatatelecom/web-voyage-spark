

# Ajuste do Layout do Centro de Suporte no Dashboard

## O que sera alterado

Na secao "Centro de Suporte" do Dashboard, o layout atual coloca o SLA Widget em 1/4 da largura e os cards de tickets em 3/4 da largura, lado a lado. A mudanca proposta:

1. **Cards de Tickets (Abertos, Em Andamento, Resolvidos, T. Medio, Tecnicos)** - Ocuparao a largura total da pagina em uma unica linha com 5 colunas
2. **Performance SLA** - Ficara logo abaixo dos cards, tambem ocupando a largura total da pagina

## Detalhes Tecnicos

### Arquivo: `src/pages/Dashboard.tsx`

Substituir o grid atual (linhas 293-300) que divide em `lg:grid-cols-4` com SLA em 1 coluna e cards em 3 colunas por:

- `TicketStatsCards` em um bloco proprio ocupando largura total
- `SLAWidget` em um bloco proprio abaixo, com `className="w-full"` para garantir largura total

### Arquivo: `src/components/tickets/TicketStatsCards.tsx`

O grid atual ja usa `grid-cols-2 md:grid-cols-4 lg:grid-cols-5`, o que distribui os 5 cards corretamente em telas grandes. Nenhuma alteracao necessaria neste componente.

