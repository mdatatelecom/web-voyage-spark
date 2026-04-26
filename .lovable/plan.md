# Editar Senha de Usuários (Admin)

## Objetivo

Permitir que administradores definam uma nova senha para qualquer usuário a partir da página de Gerenciamento de Usuários, sem precisar do fluxo de "esqueci minha senha".

## Arquitetura

A redefinição precisa rodar com privilégios de admin (`auth.admin.updateUserById`), por isso deve ser feita via **Edge Function** (não direto do client).

## Mudanças

### 1. Nova Edge Function: `supabase/functions/admin-reset-password/index.ts`
- Valida JWT e confere se quem chama tem role `admin` (mesmo padrão de `admin-create-user`).
- Recebe `{ userId, newPassword }`.
- Valida senha mínima de 6 caracteres.
- Chama `supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword })`.
- Registra em `access_logs` a ação `password_reset` com `target_user_id`.

### 2. Hook `src/hooks/useUsers.ts`
- Adicionar `resetPasswordMutation` que invoca a edge function.
- Expor `resetPassword` no retorno do hook.

### 3. Componente `src/components/users/UserEditDialog.tsx`
- Adicionar nova seção "Redefinir Senha" dentro do dialog existente:
  - Input `Nova senha` (type="password") + input `Confirmar senha`.
  - Botão "Redefinir Senha" (separado do "Salvar" do perfil).
  - Validação: ≥ 6 caracteres e senhas iguais.
  - Ao concluir: toast de sucesso e limpa os campos.
- Não interfere no fluxo de salvar nome/telefone.

### 4. `src/pages/Users.tsx`
- Passa a função `resetPassword` para o `UserEditDialog`.

## Segurança
- Apenas admins (validado server-side na edge function).
- Ação registrada em `access_logs`.
- A label/badge do usuário "atualizado em" do auth refletirá a mudança automaticamente.

## Arquivos
| Arquivo | Ação |
|---|---|
| `supabase/functions/admin-reset-password/index.ts` | Criar |
| `src/hooks/useUsers.ts` | Adicionar mutation `resetPassword` |
| `src/components/users/UserEditDialog.tsx` | Adicionar seção de redefinição de senha |
| `src/pages/Users.tsx` | Passar nova prop ao dialog |