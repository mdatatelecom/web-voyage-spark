## Escopo

Quatro itens pequenos e direcionados.

## 1. Botão "Ver chamado" nos toasts

**Já está implementado** no turno anterior em `src/hooks/useTickets.ts` (createTicket e updateTicket usam `sonnerToast.success(..., { action: { label: 'Ver chamado', onClick: () => navigate(`/tickets/${id}`) } })`). Verificar visualmente e, se necessário, ajustar duração para 6s em ambos.

## 2. Botão "Reenviar agora" em Notificações WhatsApp

Em `src/components/tickets/TicketWhatsAppStatus.tsx`:

- Trocar o `Button` ghost com ícone por um botão `variant="outline" size="sm"` com texto `Reenviar agora` + ícone `RefreshCw`.
- Mostrar para qualquer linha com status `failed` ou `retrying`.
- Comportamento já existente: chama `send-whatsapp` com o `payload` original; on-success o trigger do realtime atualiza a lista. Adicionar um `toast.info('Reenviando...')` imediato.

## 3. Adicionar "Criado por" em Detalhes do chamado

Em `src/pages/TicketDetails.tsx`, dentro do card "Detalhes" (após "Criado em"):

- Adicionar `useEffect` que busca em `profiles` o `full_name` e `avatar_url` pelo `ticket.created_by`.
- Renderizar nova linha:

```
<div className="flex items-center gap-3">
  <Avatar className="h-7 w-7"><AvatarImage src={creator.avatar_url}/><AvatarFallback>...</AvatarFallback></Avatar>
  <div>
    <div className="text-sm font-medium">Criado por</div>
    <div className="text-sm text-muted-foreground">{creator.full_name || 'Usuário'}</div>
  </div>
</div>
```

- Adicionar `useEffect` import.

## 4. Avisos do Supabase linter

O scan retornou 20 itens; **nenhum** é introduzido pela migration recente da fila WhatsApp (a tabela `whatsapp_notifications` está com RLS + policies corretas). Os avisos são pré-existentes do projeto:

| # | Tipo | Origem | Ação |
|---|------|--------|------|
| 1 | RLS Enabled No Policy (INFO) | `whatsapp_sessions` (sem policy) | Adicionar policy admin-only |
| 2 | Security Definer View (ERROR) | view legada do projeto | **Fora de escopo** — memória do projeto requer `security_invoker=true` em views; recriar a view exige saber o nome — investigar |
| 3 | Extension in Public (WARN) | extensão `pg_net`/similar | Ignorar (instalada por padrão no Supabase) |
| 4-7 | Public Bucket Allows Listing (WARN×4) | buckets `public/avatars/floor-plans/landing-assets` | Aceito por design (assets públicos) — registrar como ignorado via `manage_security_finding` |
| 8-13+ | SECURITY DEFINER executável por anon (WARN×N) | funções `update_updated_at_column`, `handle_new_user`, `has_role`, etc. | Revogar `EXECUTE` de `anon`/`public` em funções internas; manter para `has_role` (usada em RLS policies) |

### Ações concretas (migration única)

```sql
-- 1) policy mínima para whatsapp_sessions (somente service role / admin)
CREATE POLICY "Only admins can manage whatsapp sessions"
ON public.whatsapp_sessions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- 2) Revogar execução pública das funções SECURITY DEFINER internas
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.update_alert_settings_updated_at() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.log_equipment_install() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.log_equipment_change() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.set_connection_code() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_monitoring_data() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.generate_ticket_number() FROM anon, public;
-- has_role mantém EXECUTE pois é usada em RLS por authenticated.
```

### Findings registrados como ignorados

- 4 buckets públicos (avatars, public, floor-plans, landing-assets): conteúdo intencionalmente público.
- Extension in Public (`pg_net`): padrão Supabase.
- Security Definer View: investigar separadamente; provavelmente view de monitoramento — sem impacto direto na fila WhatsApp.

### Reexecutar

Após aplicar a migration, rodar `supabase--linter` novamente e listar pendências restantes ao usuário.

## Arquivos afetados

- `src/components/tickets/TicketWhatsAppStatus.tsx` — botão "Reenviar agora" mais visível.
- `src/pages/TicketDetails.tsx` — adicionar "Criado por".
- Migration SQL única para os ajustes de policy/revogações.
- `manage_security_finding` (ignore) para buckets públicos e extensão.
