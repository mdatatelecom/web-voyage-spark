## Adicionar "Criado por" na mensagem do WhatsApp

A notificação de novo chamado enviada ao grupo/contato/técnico hoje mostra: número, título, categoria, prioridade, local, equipamento, prazo, contato e descrição — mas não informa quem abriu o chamado. Vamos incluir esse dado.

### Mudanças

**`src/hooks/useTickets.ts`**

1. Estender `fetchRelatedNames` (ou criar `fetchCreatorName`) para buscar o `full_name` em `profiles` via `data.created_by`. Fallback: e-mail/`"Sistema"` quando o perfil não existir.

2. Atualizar a assinatura de `buildTicketMessage(...)` para receber `creatorName?: string` e, quando `type === 'new'`, adicionar logo após "Categoria/Prioridade":
   ```
   👤 Criado por: <Nome>
   ```

3. Em `createTicket.onSuccess`, buscar o nome do criador em paralelo com `fetchRelatedNames` e repassar para `buildTicketMessage`.

4. Aplicar o mesmo enriquecimento na mensagem direta ao técnico (linhas ~453-460), incluindo a linha "Criado por".

5. Para `updateTicket` (mensagem mais curta), adicionar a linha "Criado por" também, mantendo consistência.

### Fora do escopo
- Sem mudanças em edge functions, banco ou UI da página de tickets.
- Sem alteração no template editor (continua usando o builder do hook para chamados).