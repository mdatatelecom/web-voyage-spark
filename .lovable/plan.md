## Padronização, otimização e validação das mensagens WhatsApp de chamados

### 1. Padronizar "Criado por" em todos os templates (`src/hooks/useTickets.ts`)
- Criar helper `creatorLine(name)` que retorna sempre `👤 Criado por: <nome>\n` (mesma posição: logo após "Prioridade", antes de Local/Equipamento/Contato).
- Aplicar em três templates: `Novo Chamado Aberto`, `Atualização de Chamado` (que hoje só mostra título) e `Chamado Atribuído a Você`. Atualização passa a incluir Categoria + Prioridade + Criado por para ficar consistente.
- Extrair o template do técnico para uma função `buildTechnicianAssignmentMessage(data, creatorName)` (atualmente é string inline na `updateTicket`).

### 2. Otimizar consultas a `profiles.full_name`
- Adicionar cache em memória `Map<userId, fullName>` no módulo (`creatorNameCache`). Reaproveita o resultado entre os múltiplos envios disparados por um mesmo evento (grupo + contato + técnico) e entre eventos da sessão.
- Em `createTicket.onSuccess` e `updateTicket.onSuccess`, chamar `fetchCreatorName(data.created_by)` uma única vez no início do bloco e reutilizar a string em todos os envios subsequentes (já é o caso parcialmente; consolidar para evitar a chamada extra que existe antes de `buildTechnicianAssignmentMessage`).

### 3. Fallback robusto + logs de depuração
- `fetchCreatorName` retorna `"Sistema"` quando `created_by` é nulo, quando o `profiles` não existe, quando `full_name` é vazio ou quando há erro na consulta.
- `console.debug`/`console.warn` para cada caminho de fallback (sem expor PII): `created_by ausente`, `profile sem full_name`, `erro Supabase`.
- O cache também armazena o fallback para evitar reconsultas que sabidamente vão falhar.

### 4. Validações de campos do template
- Helper `safeValue(value, fallback)` que aplica trim e devolve fallback se vazio/nulo.
- Aplicar em `ticket_number` ("sem número"), `title` ("(sem título)"), `category` ("Outro"), `priority` ("Média") nos três templates.
- `truncateDescription` passa a tratar string só com espaços como vazia.
- `due_date` envolto em try/catch ao formatar para não quebrar com data inválida.

### 5. Testes (Vitest)
- Adicionar `vitest` + `@vitest/ui` como devDependencies e configuração mínima (`vitest.config.ts` com ambiente `node`, sem jsdom — só testamos funções puras).
- Exportar `buildTicketMessage` e `buildTechnicianAssignmentMessage` do `useTickets.ts` para permitir testes unitários (sem precisar instanciar React Query).
- Criar `src/hooks/__tests__/useTickets.messages.test.ts` cobrindo:
  - **criação**: mensagem contém `👤 Criado por: João Silva` quando `creatorName` é fornecido.
  - **criação sem nome**: cai para `Criado por: Sistema`.
  - **atualização**: mensagem inclui `Criado por` e o `statusText`.
  - **atribuição ao técnico**: `buildTechnicianAssignmentMessage` inclui `Criado por`, prioridade e contato quando presentes.
  - **campos vazios**: `title=""`, `category=null` → template não quebra e usa fallbacks.
- Adicionar script `"test": "vitest run"` no `package.json`.

### Arquivos
- Editar: `src/hooks/useTickets.ts`, `package.json`
- Criar: `vitest.config.ts`, `src/hooks/__tests__/useTickets.messages.test.ts`

### Fora do escopo
- Sem mudanças em edge functions, banco ou na UI da página de tickets.
- Sem testes E2E ou de componentes React (apenas funções puras de template).