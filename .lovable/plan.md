# Hardening do SLA: testes, telemetria, configuração e UX

Vou centralizar a lógica de SLA num utilitário puro, cobri-la com testes, expor um detalhamento no widget, tratar edge cases e permitir configurar a meta.

## 1. Novo utilitário puro `src/lib/sla-utils.ts`

Função `computeSLA(tickets, now)` retornando:
```ts
{ evaluable, onTime, breached, inconsistent, invalidDates, compliance, complianceRaw }
```
Regras:
- Sem `due_date` → ignorado.
- `due_date` inválido (parse falha) → conta em `invalidDates` e ignorado.
- `status` resolved/closed sem `resolved_at` → conta em `inconsistent` **e** como breach (numerador correto).
- Aberto/in_progress com prazo vencido → breach garantido.
- Aberto dentro do prazo → ignorado.
- `compliance = round(onTime / evaluable * 100)` (100% se denominador 0).

Helpers: `getSlaTarget()` / `setSlaTarget()` lendo de `localStorage` (default 90, clamp 1-100).

## 2. Refatorar `src/hooks/useTicketStats.ts`

- Substituir o cálculo manual atual por `computeSLA(allTickets, now)`.
- Expor no `TicketStats`:
  ```ts
  slaCompliance: number;
  slaBreakdown: SLABreakdown;     // novo
  inconsistentTickets: SLATicketLike[]; // resolved/closed sem resolved_at (max 20)
  ```
- Adicionar `console.warn` (uma vez por execução do query) listando IDs/`ticket_number` inconsistentes para depuração.

## 3. Atualizar `src/components/dashboard/SLAWidget.tsx`

- Ler meta com `getSlaTarget()` (default 90).
- Status (good/warning/critical) e mensagem "X% abaixo da meta" passam a usar a meta configurada.
- Marcador da régua passa a ficar em `${target}%` (já corrigi para 90 antes — agora dinâmico).
- **Tooltip/popover "Ver detalhes do cálculo"** (botão pequeno no header do card) abrindo um `Popover` shadcn com:
  - Total avaliável
  - Resolvidos no prazo (verde)
  - Fora do prazo / vencidos abertos (vermelho)
  - Tickets inconsistentes (âmbar) com lista dos `ticket_number` (até 5)
  - Datas inválidas ignoradas
- Pequeno botão "Ajustar meta" abrindo dialog simples com input (1-100) que chama `setSlaTarget` e força refetch.

## 4. Testes unitários `src/lib/__tests__/sla-utils.test.ts`

Cobrir:
- Apenas resolvidos no prazo → 100%.
- Resolvidos parte no prazo, parte fora → percentual correto + breakdown.
- Aberto vencido → entra como breach.
- Aberto dentro do prazo → ignorado.
- Resolved sem `resolved_at` → `inconsistent` + breach.
- `due_date` inválido → `invalidDates`, não afeta percentual.
- Sem nenhum ticket avaliável → 100%.
- `getSlaTarget` / `setSlaTarget`: default, clamp e persistência (mockando `localStorage`).

Manter o setup atual de Vitest (`vitest.config.ts` + `__tests__`).

## 5. Telemetria de inconsistências

- Em `useTicketStats`: `console.warn('[SLA] Tickets inconsistentes (resolved/closed sem resolved_at):', list)` quando `inconsistent > 0`.
- Expor a lista no widget (tooltip) para o admin agir.
- Sem novas tabelas no banco.

## Arquivos afetados
- novo: `src/lib/sla-utils.ts`
- novo: `src/lib/__tests__/sla-utils.test.ts`
- editar: `src/hooks/useTicketStats.ts`
- editar: `src/components/dashboard/SLAWidget.tsx`

Sem migrações nem mudanças de policies.
