

# Corrigir Listagem de Chamados via WhatsApp

## Problemas Identificados

### 1. Webhook possivelmente inativo
Ultima interacao registrada: 09/02/2026. O webhook da Evolution API pode ter desconectado.

### 2. Telefone sem vinculo com chamados
O telefone `5511953551207` nao possui:
- Nenhum perfil cadastrado no sistema
- Nenhum chamado com `contact_phone` ou `technician_phone` correspondente
- Nenhum `assigned_to` vinculado

Mesmo que o comando funcione, o bot responderia "Voce nao possui chamados".

## Plano de Acoes

### Passo 1: Verificar conexao do webhook
Invocar a edge function `send-whatsapp` com action `test` para confirmar que a instancia Evolution API esta conectada.

### Passo 2: Reconfigurar webhook (se necessario)
Invocar `send-whatsapp` com action `configure-webhook` para reativar o recebimento de mensagens.

### Passo 3: Cadastrar telefone no perfil
O telefone `5511953551207` precisa ser associado a um perfil existente, ou os chamados precisam ter esse telefone no campo `contact_phone`. Opcoes:
- Atualizar o perfil do usuario com esse telefone
- Ou criar um novo perfil associado

### Passo 4: Testar comando
Apos vincular o telefone, enviar `meus chamados` e verificar se lista corretamente.

## Alteracoes Tecnicas

Nenhuma alteracao de codigo necessaria. O problema e de **configuracao/dados**:
- Webhook pode estar desconectado
- Telefone sem vinculo no banco de dados

