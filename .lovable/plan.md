

# Corrigir Botão "Abrir Chamado" Desaparecido

## Problema

Ao adicionar as abas "Chamados" e "Categorias" na última alteração, o botão "Abrir Chamado" (com ícone `Plus`) foi removido do header da página. O `TicketCreateDialog` ainda está renderizado (linha 369), mas nenhum elemento chama `setCreateDialogOpen(true)`.

## Correção

**Arquivo**: `src/pages/SupportTickets.tsx`

Adicionar o botão "Abrir Chamado" no header, ao lado do título e abas (linhas 110-121). O botão deve ficar no `div` com `justify-between`, alinhado à direita:

```tsx
<div className="flex items-center justify-between">
  <div className="space-y-1">
    <h1 ...>Chamados</h1>
    <TabsList>...</TabsList>
  </div>
  {/* ADICIONAR AQUI */}
  <Button onClick={() => setCreateDialogOpen(true)}>
    <Plus className="h-4 w-4 mr-2" />
    Abrir Chamado
  </Button>
</div>
```

Alteração de uma única linha, sem impacto em outros arquivos.

