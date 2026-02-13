
# Enviar Imagem EPI junto com Alerta WhatsApp

## Problema Atual
Quando um alerta de EPI e recebido com uma imagem (screenshot da camera), a notificacao WhatsApp envia apenas o texto. A imagem fica salva no sistema mas nao e enviada junto com o alerta no WhatsApp.

## Solucao

### 1. Adicionar suporte a envio de midia no `send-whatsapp`
Criar duas novas actions na edge function `send-whatsapp`:
- `send-media`: Envia imagem para numero individual usando o endpoint `/message/sendMedia` da Evolution API
- `send-group-media`: Envia imagem para grupo usando o mesmo endpoint

Parametros: `mediaUrl` (URL publica da imagem), `caption` (texto da mensagem), `phone` ou `groupId`

### 2. Atualizar `zabbix-webhook` para enviar imagem no WhatsApp
No fluxo de notificacao EPI (linhas ~409-450), quando `imageUrl` estiver disponivel:
- Usar a action `send-media` ou `send-group-media` em vez de `send` / `send-group`
- Passar a `imageUrl` como midia e a mensagem de texto como `caption`
- Se nao houver imagem, manter o comportamento atual (envio de texto simples)

## Detalhes Tecnicos

### Edge Function `send-whatsapp` - Novas actions

```text
action: "send-media"
  -> Evolution API: POST /message/sendMedia/{instance}
  -> Body: { number, media: { mediatype: "image", url: imageUrl }, caption }

action: "send-group-media"  
  -> Mesmo endpoint, com groupId como number
```

### Edge Function `zabbix-webhook` - Alteracao no envio EPI

```text
Se imageUrl disponivel:
  -> Invocar send-whatsapp com action "send-media" ou "send-group-media"
  -> Passar mediaUrl: imageUrl, caption: notificationMessage
Senao:
  -> Manter comportamento atual (send / send-group com texto)
```

### Arquivos modificados
1. `supabase/functions/send-whatsapp/index.ts` - Adicionar actions `send-media` e `send-group-media`
2. `supabase/functions/zabbix-webhook/index.ts` - Usar envio com midia quando imagem disponivel
