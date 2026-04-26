# Adicionar botão de exclusão na coluna "Ações" dos Chamados

## Contexto

Atualmente, a coluna **Ações** da tabela em `/tickets` (`src/pages/SupportTickets.tsx`, linhas 367-378) tem apenas o botão de visualizar (ícone `Eye`). O hook `useTickets()` já expõe `deleteTicket` (mutation funcional) e a RLS do `support_tickets` já permite que apenas **admins** apaguem chamados.

## Mudanças

### `src/pages/SupportTickets.tsx`

1. **Import**: adicionar `Trash2` ao import do `lucide-react` e os componentes do `AlertDialog` (`AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle`).

2. **Hook**: extrair também `deleteTicket` de `useTickets()`.

3. **Estado local**: `const [ticketToDelete, setTicketToDelete] = useState<{id: string; number: string} | null>(null);`

4. **Coluna Ações** (linhas 367-378): ao lado do botão `Eye`, renderizar — apenas se `isAdmin` — um botão `variant="ghost" size="icon"` com ícone `Trash2` em cor destrutiva (`text-destructive`) que chama `setTicketToDelete({ id, number })` (com `e.stopPropagation()` para não navegar).

5. **AlertDialog de confirmação** ao final do JSX (junto do `TicketCreateDialog`):
   - Título: "Excluir chamado {ticket_number}?"
   - Descrição: explica que a ação é irreversível e remove comentários/anexos vinculados.
   - Botão confirmar: `variant: "destructive"`, chama `deleteTicket.mutate(ticketToDelete.id)` e fecha o dialog.

## Comportamento

- O botão de excluir só aparece para administradores (consistente com a política RLS `Admins can delete tickets`).
- Confirmação obrigatória via `AlertDialog` para evitar exclusões acidentais.
- Toast de sucesso/erro já é tratado dentro de `deleteTicket` no hook `useTickets`.
- A lista é atualizada automaticamente via `invalidateQueries(['tickets'])` que já existe na mutation.

## Não faz parte deste plano

- Adicionar exclusão no Kanban (pode ser uma melhoria futura).
- Alterar políticas de RLS (já estão corretas).
