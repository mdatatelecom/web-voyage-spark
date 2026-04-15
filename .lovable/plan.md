

# 3 Melhorias no Sistema de Comentários WhatsApp

## 1. Adicionar "comentar" ao menu de ajuda

O comando `comentar` **já está listado** no submenu `help_chamados` (linha 1642: `• *comentar 00001 [texto]*`). Porém **não aparece no menu principal** (opções 1-8) nem no submenu 6 (Anexar Arquivos).

**Ação**: Adicionar uma opção **9 - 💬 COMENTAR** ao menu principal, com submenu explicando o uso. Também adicionar a dica no submenu de Anexar (opção 6).

## 2. Permitir comentar digitando apenas número + texto

Atualmente precisa do prefixo `comentar`. A ideia é detectar automaticamente mensagens no formato `00001 texto qualquer` (5 dígitos seguidos de espaço e texto) como comentário.

**Ação**: Adicionar no `extractCommand` uma detecção para o padrão `/^\d{5}\s+.+/` que retorna `{ command: 'comment', args: texto }`. Deve ficar **após** todos os comandos explícitos para não conflitar.

## 3. Notificação visual em tempo real

O realtime já está configurado: `ticket_comments` está na publicação e `useTicket` já invalida o cache quando um novo comentário chega. Porém **não há toast/notificação visual** para alertar o usuário.

**Ação**: No callback do realtime de comentários (useTickets.ts ~linha 716), quando `event === 'INSERT'` e `payload.new.source === 'whatsapp'`, exibir um toast com som/vibração informando que chegou um comentário via WhatsApp.

## Arquivos Alterados

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/whatsapp-webhook/index.ts` | Menu principal: opção 9 (Comentar). Submenu 9 com instruções. `extractCommand`: detectar padrão `NNNNN texto` como comment shortcut |
| `src/hooks/useTickets.ts` | No realtime de comentários, adicionar toast para novos comentários WhatsApp |

## Detalhes Técnicos

### extractCommand - novo pattern (antes do `return null`)
```typescript
// Shortcut: 5 dígitos + espaço + texto = comentar
const shortcutMatch = text.match(/^(\d{5})\s+(.+)/s);
if (shortcutMatch) {
  return { command: 'comment', args: `${shortcutMatch[1]} ${shortcutMatch[2]}` };
}
```

### Realtime toast (useTickets.ts)
```typescript
(payload) => {
  queryClient.invalidateQueries({ queryKey: ['ticket-comments', ticketId] });
  if (payload.eventType === 'INSERT' && payload.new?.source === 'whatsapp') {
    toast.info(`💬 Novo comentário via WhatsApp de ${payload.new.whatsapp_sender_name || 'WhatsApp'}`);
  }
}
```

