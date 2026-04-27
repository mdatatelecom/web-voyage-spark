## Problema confirmado

Consulta no banco mostra que em 2026 existem 3 tickets, mas o maior número é `TKT-2026-00023`. A função atual usa `COUNT(*)+1`, gerando `TKT-2026-00004`, o que pode colidir e provoca o erro de unique constraint ao cadastrar chamado.

Não há duplicatas existentes nem números fora do padrão — não há limpeza retroativa a fazer.

## Estratégia escolhida

Combinação de **três camadas de defesa** para zero colisão mesmo em alto volume:

1. **Sequência dedicada por ano** (`ticket_number_seq_<ano>`), criada sob demanda.
2. **Advisory lock** (`pg_advisory_xact_lock`) no escopo do ano para serializar a criação da sequência e a leitura do MAX inicial.
3. **Inicialização por MAX existente**: ao criar a sequência do ano, ela é alinhada com `MAX(suffix)+1` para respeitar gaps históricos.
4. **Retry no client** (até 3 tentativas) caso, em alguma transição, ainda ocorra `23505` (unique violation).

## Mudanças

### 1. Migration — reescrever `generate_ticket_number()`

```text
function generate_ticket_number() trigger:
  ano = EXTRACT(YEAR FROM NOW())
  seq_name = 'ticket_number_seq_' || ano
  pg_advisory_xact_lock(hashtext(seq_name))
  IF sequência não existe THEN
    max_existente = COALESCE(MAX(suffix do ano), 0)
    CREATE SEQUENCE seq_name START max_existente + 1
  END IF
  next_num = nextval(seq_name)
  NEW.ticket_number = 'TKT-' || ano || '-' || LPAD(next_num, 5, '0')
```

Mantém o trigger `set_ticket_number` já existente (BEFORE INSERT).

### 2. Cliente — retry + mensagem amigável (`src/hooks/useTickets.ts`)

No `createTicket.mutationFn`, encapsular o `insert` em loop de até 3 tentativas; só repete se erro for código `23505` em `support_tickets_ticket_number_key`. Em caso de falha final (ou outro erro), `onError` mostra:

- Duplicidade persistente: "Não foi possível gerar um número único para o chamado. Tente novamente em instantes."
- Outros erros: mensagem genérica atual.

### 3. Validação automatizada (script único, descartável)

Após aplicar a migration, rodar via `psql` no sandbox:

- **Teste de gaps**: inserir 5 tickets, verificar que números seguem a sequência sem colidir com `TKT-2026-00023` existente.
- **Teste de concorrência**: rodar 20 INSERTs paralelos (`xargs -P 20`) e confirmar `COUNT(DISTINCT ticket_number) = 20` e zero erros 23505.
- **Auditoria final**: listar duplicatas (`GROUP BY ticket_number HAVING COUNT(*)>1`) e formato inválido — esperado vazio.
- Limpar os tickets de teste ao final.

### 4. Auditoria (já feita em modo leitura)

- Duplicatas atuais: **0**
- Tickets fora do padrão `TKT-YYYY-00000`: **0**
- Não há correções retroativas necessárias.

## Arquivos afetados

- `supabase/migrations/<novo>.sql` — nova versão de `generate_ticket_number()`.
- `src/hooks/useTickets.ts` — retry no `createTicket` + mensagem de erro específica para 23505.

Sem mudanças em `TicketCreateDialog.tsx` (a UI já mostra o toast de erro vindo do hook).

## Por que essa abordagem

- **Sequência por ano** é a forma idiomática Postgres para gerar IDs únicos sem race condition — `nextval` é atômico.
- **Advisory lock** só é necessário no momento de criar a sequência do ano (uma vez por ano); depois disso, `nextval` sozinho garante unicidade sem bloqueio.
- **Respeita gaps históricos** (ex.: o `TKT-2026-00023` existente) ao iniciar a sequência em `MAX+1`.
- **Retry no client** é cinto-e-suspensórios para o caso raro de inserts fora do trigger ou condições de borda.
