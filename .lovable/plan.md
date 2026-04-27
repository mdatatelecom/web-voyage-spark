# 🔇 Desativar Respostas Automáticas do Bot WhatsApp

## 🎯 Objetivo
Silenciar o bot (sem menu, comandos, wizard ou "comando não reconhecido"), **mantendo** o webhook ativo apenas para captura de respostas em notificações de chamados (reply vira comentário no ticket).

## 🛠️ Alterações em `supabase/functions/whatsapp-webhook/index.ts`

### 1. Adicionar flag no topo do handler
```ts
const BOT_RESPONSES_ENABLED = false;
```

### 2. Curto-circuito antes do dispatcher de comandos
Logo **após** a lógica de captura de reply em notificação (que cria comentário no ticket — manter intacta), e **antes** de:
- `extractCommand`
- handlers de wizard (`getSession`, `handleWizard*`)
- handlers de comando (`handleMenu`, `handleHelp`, `handleStatus`, `handleNew`, `handlePrioridade`, etc.)
- envio do fallback "❓ Comando não reconhecido"

inserir:
```ts
if (!BOT_RESPONSES_ENABLED) {
  return new Response(JSON.stringify({ ok: true, botDisabled: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
```

## ✅ Continua funcionando
- Recebimento do webhook (Evolution API segue entregando)
- Captura de respostas em notificações de chamado → vira comentário no ticket
- Envio de notificações (criar/atualizar ticket, alertas Zabbix/EPI, botão WhatsApp manual)
- Templates, grupos, histórico, configurações em `/system`

## ❌ Para de funcionar
- Menu inicial (oi, ajuda, menu, bom dia, etc.)
- Comandos `status`, `novo`, `prioridade`, `#TKT-XXXX`
- Wizard de criação de chamado via WhatsApp
- Mensagem "comando não reconhecido"

## 🔁 Reversão
Trocar `BOT_RESPONSES_ENABLED = true` e redeployar.

## 📦 Arquivos afetados
- `supabase/functions/whatsapp-webhook/index.ts` (deploy automático)