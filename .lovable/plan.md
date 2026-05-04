# Verificação do Performance SLA

Revisei `src/hooks/useTicketStats.ts` (cálculo) e `src/components/dashboard/SLAWidget.tsx` (exibição). A maior parte está coerente, mas há **3 problemas** que afetam a precisão do indicador.

## Problemas encontrados

### 1. Denominador do `slaCompliance` está incorreto (principal)
Hoje:
```ts
const ticketsWithDueDate = allTickets.filter(t => t.due_date);
const resolvedWithinSLA = ticketsWithDueDate.filter(t =>
  (t.status === 'resolved' || 'closed') && resolved_at < due_date
).length;
const slaCompliance = resolvedWithinSLA / ticketsWithDueDate.length;
```
O denominador inclui tickets **abertos/em andamento** que ainda nem venceram. Eles entram como "não-cumpridos", derrubando artificialmente o SLA.

**Correção**: o universo deve ser **tickets já avaliáveis**:
- resolvidos/fechados (com due_date), **mais**
- tickets em aberto cujo prazo já passou (breach garantido).

Tickets em aberto ainda dentro do prazo NÃO entram no cálculo.

### 2. `wasResolvedOnTime` retorna `true` quando falta `resolved_at`
```ts
if (!t.due_date || !t.resolved_at) return true;
```
Em `slaByCategory`/`slaByTechnician` filtramos por status resolved/closed, mas se algum desses não tiver `resolved_at` preenchido, é contado como "no prazo" indevidamente. Deve retornar `false` (ou excluir esses casos do total) quando o ticket está resolvido sem `resolved_at`.

### 3. Marcador visual "90%" desalinhado no `SLAWidget`
```tsx
<span className="border-l ... ml-[80%]">90%</span>
```
O marcador da meta de 90% aparece em ~80% da barra. Trocar para `ml-[90%]` (e ajustar layout do flex para posicionar absoluto, evitando o `flex justify-between` empurrar o elemento).

## Itens verificados e OK
- `overdueTickets`: correto (ignora resolvidos/fechados, compara `due_date < now`).
- `urgentTickets` + `deadlineStatus` (overdue/critical ≤4h/warning ≤24h/normal ≤72h): correto.
- Cores/labels do widget (verde ≥90, âmbar ≥80, vermelho <80): coerentes com a meta.
- `slaTrend` mensal: usa o mesmo critério de "resolvidos no mês com due_date" — esse é um recorte legítimo (SLA dos resolvidos no período), apenas diferente do widget. Manter.

## Plano de implementação

1. **`src/hooks/useTicketStats.ts`**
   - Ajustar `slaCompliance`: novo universo = `resolvidos/fechados com due_date` ∪ `abertos/in_progress com due_date vencido`. Numerador continua sendo "resolvidos antes do due_date".
   - Ajustar `wasResolvedOnTime` para retornar `false` quando o ticket está resolvido/fechado mas sem `resolved_at`, e manter `true` apenas quando não há `due_date`.

2. **`src/components/dashboard/SLAWidget.tsx`**
   - Corrigir posição do marcador "90%" na barra de progresso (usar posicionamento absoluto sobre a `Progress` em 90%).

3. **Testes rápidos**
   - Conferir via `supabase--read_query` uma amostra de tickets para validar que o novo `slaCompliance` reflete melhor a realidade (sem inflar nem deflar).

Sem mudanças de banco/policies necessárias.
