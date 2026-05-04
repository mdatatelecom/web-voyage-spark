
# Confirmação visual de abertura do chamado + envio da notificação

## Comportamento atual

Em `src/hooks/useTickets.ts > createTicket`:

- O toast `"Chamado criado"` aparece imediatamente após o `INSERT`, **sem indicar se a notificação WhatsApp foi enviada**.
- A chamada `supabase.functions.invoke('send-whatsapp', ...)` é feita em sequência mas o resultado (`success`/`error`) é **ignorado** (não há leitura de `data.success`, só `try/catch` para erro de rede).
- Resultado prático: o usuário vê "Chamado criado" mesmo quando o WhatsApp falha (504/timeout/instância travada) e nunca recebe feedback sobre o envio.

## O que vamos mudar

Tornar o feedback completo em duas etapas, com toasts distintos:

### 1. Toast imediato — "Chamado #TKT-2026-XXXXX aberto"
Continua aparecendo logo após o INSERT bem-sucedido, mas:
- Mostra o **número do chamado** gerado (ex.: `Chamado TKT-2026-00123 aberto com sucesso`)
- Inclui um botão "Ver chamado" que navega para `/tickets/{id}`

### 2. Toast de notificação WhatsApp — "Notificação enviada / Falha no envio"
Após chamar `send-whatsapp`, ler `data.success` e exibir:
- ✅ `"Notificação enviada para o grupo {nome}"` (verde) quando `success: true`
- ⚠️ `"Chamado aberto, mas notificação WhatsApp falhou: {motivo}"` (amber, não destrutivo) quando `success: false` ou exceção. O motivo vem de `data.message` (ex.: "Sessão travada", "Timeout", "401").
- 🔕 Quando nenhum grupo está configurado, mostrar info discreta: `"Chamado aberto. Nenhum grupo WhatsApp configurado para esta categoria."`

### 3. Mesma lógica para envio individual
Quando `data.contact_phone` existir, emitir toast paralelo confirmando entrega ao contato (ou aviso se falhar).

### 4. Mesma lógica em `updateTicket`
Aplicar o mesmo padrão (toast de sucesso da atualização + toast separado do WhatsApp), inclusive nas notificações específicas para técnico atribuído.

## Arquivos alterados

- `src/hooks/useTickets.ts` — ler resposta de `send-whatsapp`, emitir toasts diferenciados (sucesso/aviso) tanto no `createTicket.onSuccess` quanto no `updateTicket.onSuccess`. Sem mudança de assinatura pública do hook.

## Sem mudanças no banco e sem nova edge function

A edge function `send-whatsapp` já retorna `{ success, message }` com mensagens amigáveis (incluindo casos de "Connection Closed", 401, etc). Só estamos passando a **consumir** essa resposta no front.

## Resultado para o usuário

Ao abrir um chamado, em vez de um único toast genérico, o usuário verá:

1. ✅ "Chamado **TKT-2026-00124** aberto" — confirma criação no banco
2. ✅ "Notificação enviada ao grupo **Rede**" — confirma WhatsApp
   *(ou ⚠️ "Notificação WhatsApp falhou: sessão travada — verifique a instância")*

Assim fica claro o que efetivamente saiu, mesmo quando a Evolution API está com problema.
