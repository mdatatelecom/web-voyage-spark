## Objetivo

Tornar o feedback de criação/atualização de chamados consistente, visível e resiliente — com toasts padronizados, ação rápida para abrir o chamado, status do envio WhatsApp visível na própria página do ticket e fila de retry automático.

## 1. Botão "Ver chamado" no toast

Adicionar `action` no `sonnerToast.success` de criação e atualização para navegar até `/tickets/:id`.

- Em `useTickets.ts`, importar `useNavigate` no hook `useTickets`.
- Atualizar o toast principal de `createTicket.onSuccess`:
  - Título: `Chamado {ticket_number} aberto`
  - Descrição: `data.title`
  - `action: { label: 'Ver chamado', onClick: () => navigate(`/tickets/${data.id}`) }`
  - `duration: 6000`
- Mesmo padrão no `updateTicket.onSuccess` (título: `Chamado {ticket_number} atualizado`).

## 2. Status de WhatsApp visível no ticket

Exibir, na página do chamado, o status da última notificação enviada para grupo e contato (enviado / falhou + motivo + horário).

### Backend (migration)

A tabela `whatsapp_notifications` já registra envios. Adicionar:
- política RLS de SELECT para o `created_by` do ticket relacionado (além de admin/técnico que já têm).
- Habilitar realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_notifications;`

### Frontend

- Novo componente `src/components/tickets/TicketWhatsAppStatus.tsx`:
  - Recebe `ticketId`.
  - Consulta `whatsapp_notifications` filtrando por `ticket_id`, ordenado por `created_at desc`.
  - Agrupa por `message_type` (grupo vs contato) e mostra o último de cada:
    - Badge verde "Enviado" quando `status='sent'`
    - Badge vermelho "Falhou" + tooltip com `error_message`
    - Badge amarelo "Pendente / Em fila"
    - Horário relativo (`date-fns formatDistanceToNow`)
  - Botão "Reenviar" em caso de falha (chama `send-whatsapp` novamente).
  - Subscrição realtime no canal `whatsapp_notifications` filtrando `ticket_id=eq.{id}`.
- Inserir o componente em `src/pages/TicketDetails.tsx` em um card "Notificações WhatsApp" abaixo dos metadados do chamado.

## 3. Fila de notificações com retry automático

Reaproveitar `whatsapp_notifications` como fila persistente.

### Migration

Adicionar colunas em `whatsapp_notifications`:
- `attempts integer not null default 0`
- `next_retry_at timestamptz`
- `last_attempt_at timestamptz`
- `payload jsonb` (action, groupId/phone, message, ticketId)

Status passa a usar: `pending | sent | failed | retrying`.

### Edge function `send-whatsapp` (mudanças mínimas)

- Antes de cada `INSERT` em `whatsapp_notifications`, definir `payload` e atualizar `attempts`.
- Em falhas de rede / timeout / `disconnectionReasonCode != null` / status HTTP 5xx ou 504:
  - status `retrying`, `next_retry_at = now() + backoff` (15s, 60s, 5min — máx 5 tentativas).
  - retorna ao cliente `{ success: false, queued: true, message }` para o toast informar "em fila".
- Em sucesso: `status='sent'`, `sent_at=now()`.
- Em falha definitiva (>5 tentativas ou erro permanente — instância removida): `status='failed'`.

### Nova edge function `whatsapp-retry-worker`

- Roda manualmente / via cron (configurável depois). Por enquanto:
  - Seleciona até 20 registros com `status='retrying' AND next_retry_at <= now()`.
  - Reenvia chamando a mesma lógica interna.
- Adicionada também trigger client-side: quando `TicketWhatsAppStatus` carrega, dispara `whatsapp-retry-worker` (no-op se vazio).

## 4. Padronização de toasts (createTicket vs updateTicket)

Criar helper interno em `useTickets.ts` para uniformizar mensagens, ícones e durações:

```ts
const TOAST = {
  ticketSuccess: 5000,
  waSuccess: 3500,
  waWarning: 7000,
  waInfo: 4000,
};

const notifyWhatsApp = (
  channel: 'grupo' | 'contato' | 'técnico',
  result: { success: boolean; reason?: string; queued?: boolean }
) => { /* warning/success/info padronizados */ };
```

Mensagens padrão:
- Sucesso grupo: `Notificação enviada ao grupo WhatsApp`
- Sucesso contato: `WhatsApp enviado a {phone}`
- Em fila: `Notificação WhatsApp em fila — será reenviada automaticamente`
- Falha: `Falha no WhatsApp ({canal}) — {motivo}`

Aplicar o helper em todos os 4 pontos de envio (createTicket grupo+contato, updateTicket grupo+contato+técnico+cliente).

## Arquivos afetados

- `src/hooks/useTickets.ts` — toasts padronizados, `useNavigate`, action "Ver chamado", helper `notifyWhatsApp`.
- `src/components/tickets/TicketWhatsAppStatus.tsx` — novo.
- `src/pages/TicketDetails.tsx` — inserir o componente.
- `supabase/functions/send-whatsapp/index.ts` — gravar `payload`, `attempts`, marcar `retrying` com backoff em vez de falha direta em timeouts.
- `supabase/functions/whatsapp-retry-worker/index.ts` — nova função.
- Migration: colunas extras em `whatsapp_notifications`, RLS extra, realtime publication.

## Fora de escopo

- Cron automático do worker (pode ser ativado depois via `pg_cron` se desejar).
- Reescrita do tratamento de "instância zumbi" (continua funcionando como já implementado).
