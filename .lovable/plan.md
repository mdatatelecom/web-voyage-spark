# Confirmação SLA + Testes + Job de Backfill

## 1. Verificação (já feita)
Query confirmou: **0 tickets** com status `resolved`/`closed` sem `resolved_at`. O dashboard agora mostra SLA sem inconsistências para os 5 tickets corrigidos (TKT-2025-00002/00003, TKT-2026-00059/00060/00062).

## 2. Testes de integração (backend Express)

Adicionar Jest + ts-jest e teste do `update` do controller, garantindo que `resolved_at` é sempre preenchido quando o status vira `resolved` ou `closed`.

**Arquivos:**
- `backend/package.json` — adicionar devDeps: `jest`, `ts-jest`, `@types/jest`
- `backend/jest.config.js` (novo) — preset ts-jest, env node
- `backend/src/controllers/__tests__/tickets.update.test.ts` (novo) — mocka `database.query` e valida o array de parâmetros enviado ao `UPDATE`:
  - status `resolved` → `resolvedAt` preenchido
  - status `closed` → `resolvedAt` E `closedAt` preenchidos
  - status `in_progress` → ambos `null` (não sobrescreve)
  - sem status → ambos `null`
  - ticket inexistente → 404

## 3. Job recorrente de backfill (pg_cron)

Agendar no Postgres (extensões `pg_cron` e `pg_net` já habilitadas) um job diário que executa:

```sql
UPDATE public.support_tickets
SET resolved_at = COALESCE(closed_at, updated_at)
WHERE status IN ('resolved','closed') AND resolved_at IS NULL;
```

Como é uma operação puramente SQL no próprio banco, não precisa chamar edge function — basta `cron.schedule` executando o UPDATE direto.

**Schedule:** `5 3 * * *` (03:05 UTC, diariamente). Job nomeado `support_tickets_resolved_at_backfill`.

Será executado via `supabase--insert` (contém SQL específico do projeto, não migração).

## Detalhes técnicos

- O controller já foi corrigido em mensagem anterior para sempre setar `resolved_at` ao virar resolved/closed; os testes blindam essa regra contra regressões.
- O job é defensivo: se algum fluxo externo (webhook, script manual) inserir/atualizar um ticket pulando o controller, o backfill diário corrige no máximo em 24h.
- Não usamos CHECK constraint nem trigger no banco para evitar acoplar a lógica do app ao schema (mantendo compatibilidade com migrações já aprovadas).
