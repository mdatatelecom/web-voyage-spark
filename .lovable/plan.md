

# Agregar Anexos de Comentários na Seção Principal de Anexos

## Problema

Atualmente, o ticket tem dois locais separados para anexos:
1. **Anexos do Chamado** (`ticket.attachments`) — só mostra uploads diretos no ticket
2. **Anexos em Comentários** — inline dentro de cada comentário (incluindo WhatsApp)

Os anexos enviados via WhatsApp ficam salvos apenas no comentário, não aparecem na seção principal de anexos.

## Solução

Agregar todos os anexos (do ticket + de todos os comentários) em uma única seção "Anexos do Chamado", indicando a origem de cada um.

### Arquivo: `src/pages/TicketDetails.tsx`

**Alterações:**

1. **Criar lista agregada de anexos** combinando `ticket.attachments` e `comments[].attachments`:
   - Cada item terá um campo `source` indicando origem ("ticket", "whatsapp", "web")
   - Incluir nome do remetente e data para anexos de comentários

2. **Atualizar a seção "Anexos do Chamado"** para usar a lista agregada:
   - Badge indicando origem (📎 Ticket / 💬 WhatsApp / 🌐 Web)
   - Contagem total atualizada
   - Botão de delete apenas para anexos do ticket (não de comentários)

3. **Manter os anexos inline nos comentários** como estão — exibição dupla intencional para contexto

### Detalhes Técnicos

```tsx
// Agregar anexos
const allAttachments = useMemo(() => {
  const ticketAtts = ((ticket?.attachments as any[]) || []).map(a => ({
    ...a, source: 'ticket', sourceLabel: 'Upload'
  }));
  const commentAtts = (comments || []).flatMap(c => 
    ((c.attachments as any[]) || []).map(a => ({
      ...a, source: c.source || 'web',
      sourceLabel: c.source === 'whatsapp' ? c.whatsapp_sender_name || 'WhatsApp' : 'Comentário',
      commentDate: c.created_at
    }))
  );
  return [...ticketAtts, ...commentAtts];
}, [ticket, comments]);
```

A contagem no header mostrará o total agregado. Cada card de anexo terá um badge pequeno indicando a origem.

