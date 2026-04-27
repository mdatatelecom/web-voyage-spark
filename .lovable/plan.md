# Erro ao listar grupos do WhatsApp

## Diagnóstico

Pelos logs da edge function `send-whatsapp`, a chamada `GET /group/fetchAllGroups/Mdata` está retornando:

```
status: 500
{"status":500,"error":"Internal Server Error","response":{"message":"Connection Closed"}}
```

Importante notar:
- O `connectionState` da instância **Mdata** retorna `state: "open"` (a UI mostra "Conectado" ✅)
- Mas o endpoint `fetchAllGroups` falha com `Connection Closed` no servidor da Evolution API
- A instância **Mdata** tem `disconnectionReasonCode: 401` histórico (device_removed em 28/03), porém foi reaberta. O Baileys interno provavelmente está num estado inconsistente onde aceita `connectionState` mas não consegue mais executar queries IQ no WhatsApp (typical Baileys "stream open mas socket morto").

Ou seja: **não é bug do nosso código** — é a sessão Baileys da instância `Mdata` que está zumbi no servidor `chat.mdatatelecom.com.br`.

## Causa raiz

Evolution API (Baileys) mantém o socket marcado como `open` mesmo quando a conexão WebSocket com o WhatsApp já caiu. Qualquer request que precise tráfego real (fetchAllGroups, sendMessage para grupo) retorna 500 "Connection Closed".

## Plano de correção

### 1. Ação imediata (servidor Evolution API — manual)
Reiniciar a instância `Mdata` no painel da Evolution API:
- Logout da instância → reconectar via QR Code
- Ou usar endpoint `POST /instance/restart/Mdata`

### 2. Melhorias no código (`supabase/functions/send-whatsapp/index.ts`)

**a) Detectar "Connection Closed" e tentar restart automático**
Quando `list-groups` ou `send-group` recebem 500 com `Connection Closed`, chamar `POST /instance/restart/{instance}` automaticamente e reportar mensagem clara.

**b) Mensagem de erro amigável no toast**
Em vez de "Erro ao listar grupos: 500", mostrar:
> "A sessão do WhatsApp da instância **Mdata** está travada no servidor (Connection Closed). Clique em **Reconectar** ou tente novamente em alguns segundos — uma reinicialização automática foi disparada."

**c) Botão "Reiniciar instância" na UI de WhatsApp** (`/system`)
Adicionar ação `restart-instance` na edge function + botão na tela de configuração do WhatsApp ao lado de Reconectar, para forçar restart sem precisar reescanear QR.

### 3. Validação
- Após restart, testar `list-groups` novamente
- Testar envio para grupo de chamado
- Confirmar que notificações de novos chamados voltam a chegar

## Resumo do que será alterado

- **`supabase/functions/send-whatsapp/index.ts`**: tratar 500 "Connection Closed", auto-restart, novo action `restart-instance`, mensagens de erro melhores
- **`src/components/system/WhatsAppSettings.tsx`** (ou equivalente): botão "Reiniciar instância" + toast amigável
- **Sem mudanças no banco**

## O que você precisa fazer agora
Enquanto ajusto o código, reinicie a instância **Mdata** no painel Evolution API (`https://chat.mdatatelecom.com.br`) — Logout + reconectar via QR. Isso destrava as notificações imediatamente.
