

## Plano: Correções e Melhorias no Gerenciamento de Usuários

### Problemas Identificados

Após análise do código e das requisições de rede, identifiquei os seguintes problemas:

---

### 1. Botão "Adicionar Role" na Tabela de Usuários

**Problema Atual:**
No arquivo `Users.tsx` (linha 281-287), o botão "Adicionar Role" na tabela de usuários abre o mesmo diálogo genérico (`UserRoleDialog`) que exige buscar o usuário por email novamente. Isso é confuso porque o usuário já está selecionado na linha da tabela.

**Solução:**
Passar o usuário selecionado diretamente para o diálogo ou criar um fluxo simplificado.

---

### 2. Fluxo do UserRoleDialog

**Problema Atual:**
O componente `UserRoleDialog` exige dois passos:
1. Buscar usuário por email (chamando edge function)
2. Atribuir a role

Quando clicamos em "Adicionar Role" na linha do usuário, o email já é conhecido, mas não é passado para o diálogo.

**Solução:**
Modificar o `UserRoleDialog` para aceitar um `userId` opcional. Se passado, pular a etapa de busca.

---

### 3. Verificação de Permissões - Configurações

**Verificação Realizada:**
- `/system` → Requer `admin` (App.tsx linha 248-254)
- `/users` → Requer `admin` (App.tsx linha 208-214)
- `/alert-settings` → Requer `admin` (App.tsx linha 240-246)
- `/monitoring/settings` → Requer `admin` (App.tsx linha 437-444)

**Status:** As rotas estão corretamente protegidas com `requiredRole="admin"`.

**Menu Lateral (AppLayout.tsx):**
- Grupo "Sistema" (linha 189-199): `visible: isAdmin && !isNetworkViewer`
- "Configurações" do Monitoramento (linha 184): `visible: isAdmin`

**Status:** Menu está corretamente restrito a admins.

---

### 4. Melhorias Propostas

---

#### A. Corrigir Botão "Adicionar Role" na Tabela

**Arquivo:** `src/pages/Users.tsx`

Modificar para passar o usuário selecionado:
```typescript
// Antes (linha 281-287):
<Button onClick={() => setRoleDialogOpen(true)}>
  Adicionar Role
</Button>

// Depois:
const [selectedUserForRole, setSelectedUserForRole] = useState<User | null>(null);

<Button onClick={() => {
  setSelectedUserForRole(user);
  setRoleDialogOpen(true);
}}>
  Adicionar Role
</Button>
```

---

#### B. Melhorar UserRoleDialog

**Arquivo:** `src/components/users/UserRoleDialog.tsx`

Adicionar prop opcional para receber usuário pré-selecionado:

```typescript
interface UserRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedUser?: { id: string; email: string } | null;
}

// Se preselectedUser existir, pré-preencher e pular busca
useEffect(() => {
  if (preselectedUser) {
    setEmail(preselectedUser.email);
    setFoundUserId(preselectedUser.id);
  }
}, [preselectedUser]);
```

---

#### C. Adicionar Atribuição Direta de Role na Tabela

**Melhoria UX:** Adicionar dropdown direto na tabela para adicionar role rapidamente sem abrir diálogo.

```typescript
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" size="sm">
      <Plus className="w-3 h-3 mr-1" />
      Role
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    {['viewer', 'network_viewer', 'technician', 'admin']
      .filter(r => !user.roles.includes(r as UserRole))
      .map(role => (
        <DropdownMenuItem 
          key={role}
          onClick={() => assignRole({ userId: user.id, role: role as UserRole })}
        >
          {getRoleLabel(role as UserRole)}
        </DropdownMenuItem>
      ))
    }
  </DropdownMenuContent>
</DropdownMenu>
```

---

#### D. Melhorar Feedback Visual

**Adicionar loading state** ao atribuir role:
- Mostrar spinner no botão durante atribuição
- Feedback visual quando role é adicionada

---

### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/pages/Users.tsx` | Modificar | Adicionar state para usuário selecionado, dropdown de roles |
| `src/components/users/UserRoleDialog.tsx` | Modificar | Aceitar usuário pré-selecionado |
| `src/hooks/useUsers.ts` | Verificar | Garantir que `assignRole` funciona corretamente |

---

### Verificações de Segurança Realizadas

| Área | Status | Detalhes |
|------|--------|----------|
| Rotas protegidas | OK | `/users`, `/system`, `/alert-settings` requerem admin |
| Menu lateral | OK | Grupo "Sistema" só visível para admin |
| RLS policies | OK | `user_roles` tem policy "Only admins can manage roles" |
| Edge functions | OK | `admin-list-users` e `admin-find-user-by-email` verificam role admin |

---

### Resumo das Alterações

1. **UserRoleDialog** - Aceitar `preselectedUser` prop para pular busca
2. **Users.tsx** - Passar usuário selecionado ao abrir diálogo
3. **Users.tsx** - Adicionar dropdown de roles na tabela para ação rápida
4. **Users.tsx** - Melhorar feedback visual durante atribuição

