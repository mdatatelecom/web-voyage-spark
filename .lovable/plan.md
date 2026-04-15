

# Criar Chamado ao Responder/Marcar Mensagem no WhatsApp

## Funcionalidade

Quando um usuario **responder (reply/marcar)** qualquer mensagem no WhatsApp com um comando como `abrir chamado` ou `criar chamado`, o bot usara o conteudo da mensagem original (quoted) como descricao do novo chamado.

## Como Funciona Hoje

O webhook ja extrai `contextInfo` e `quotedMessage` (linha 866-868) para detectar numeros de chamado em mensagens marcadas. Se encontra um ticket, adiciona comentario. Se nao encontra, ignora o contexto.

## Alteracao

### `supabase/functions/whatsapp-webhook/index.ts`

Na area de processamento de comandos, quando o comando for `novo`, `start_wizard`, ou variantes de criacao, verificar se existe uma `quotedMessage`. Se sim:

1. Usar o texto da mensagem marcada como **descricao** do chamado
2. Gerar um titulo automatico (primeiras ~60 chars da mensagem marcada)
3. Criar o chamado diretamente (categoria `other`, prioridade `medium`) sem wizard
4. Confirmar ao usuario com o numero do chamado

**Logica a inserir** (no handler do comando `novo`/`start_wizard`, antes de iniciar o wizard):

```text
Se quotedMessage nao esta vazio E comando e de criacao:
  → titulo = primeiros 60 chars da quotedMessage
  → descricao = quotedMessage completo
  → Criar chamado com categoria 'other', prioridade 'medium'
  → Responder: "Chamado TKT-XXXX-XXXXX criado a partir da mensagem marcada"
  → Perguntar se quer ajustar categoria/prioridade
```

Se o reply nao contem comando de criacao, o comportamento atual permanece (adicionar comentario ou erro).

**Tambem adicionar** deteccao na area de "unrecognized commands" (linha 4375): se a mensagem nao e um comando reconhecido MAS tem uma quotedMessage, oferecer a opcao de criar chamado a partir dela.

## Resumo

| Local | Alteracao |
|-------|----------|
| whatsapp-webhook ~L1200-1250 (comando `novo`) | Detectar quotedMessage e criar chamado direto |
| whatsapp-webhook ~L4374-4400 (unrecognized) | Sugerir criacao quando reply sem comando |

