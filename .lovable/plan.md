# Corrigir scroll do dialog de edição de usuário

## Problema

Conforme a captura de tela, o `UserEditDialog` exibe muito conteúdo (avatar, status de cache, botões de foto, nome, telefone, e a nova seção de redefinir senha com 2 campos + botão). Em viewports menores (como o atual 948x575), o conteúdo ultrapassa a altura da tela: os campos finais ("Confirmar senha") e o footer (Cancelar / Salvar) ficam inacessíveis, e não é possível rolar dentro do dialog.

## Causa

O `DialogContent` atual não tem altura máxima nem área de scroll interna — apenas usa `sm:max-w-[500px]`. Com a adição recente da seção "Redefinir Senha", o conteúdo total passou a exceder a viewport.

## Solução

Reestruturar o `DialogContent` em layout flex vertical com header e footer fixos e área central rolável.

### Arquivo: `src/components/users/UserEditDialog.tsx`

1. **`DialogContent`**: adicionar `max-h-[90vh] flex flex-col p-0` (limita altura à viewport, organiza em coluna, padding será aplicado nos filhos).

2. **`DialogHeader`**: adicionar `px-6 pt-6 flex-shrink-0` para manter padding e não ser comprimido.

3. **Wrapper do conteúdo central** (a `div` com `space-y-6 py-4`): trocar para `flex-1 overflow-y-auto px-6 py-4` — esta passa a ser a única área rolável.

4. **`DialogFooter`**: adicionar `px-6 pb-6 pt-4 border-t flex-shrink-0` para fixar o rodapé com separador visual sutil.

## Resultado

- Título sempre visível no topo
- Avatar, campos e seção "Redefinir Senha" rolam internamente quando excedem a tela
- Botões "Cancelar" e "Salvar" sempre visíveis no rodapé
- Funciona em qualquer tamanho de viewport (incluindo 948x575 e telas menores)
