# 🤖 Melhorar Iniciação do Bot WhatsApp

## 🎯 Problema
O bot só responde quando o usuário digita exatamente `menu`. Saudações comuns (`oi tudo bem?`, `bom diaa`, `eai`, `ajuda`, `start`) não disparam o menu inicial.

## 📋 Causa Raiz (em `supabase/functions/whatsapp-webhook/index.ts`)
1. **Linha 273-277**: lista pequena de palavras-gatilho e usando `===` (match exato).
2. **Falta de fallback inteligente**: qualquer coisa fora da lista cai em "Comando não reconhecido".
3. **Em grupos**, mensagens curtas/saudações nem disparam o menu.

## 🛠️ Mudanças Propostas

### 1. Expandir gatilhos de saudação (`extractCommand`, linha ~272)
Substituir o bloco atual por uma lógica mais permissiva:

- **Lista expandida de palavras de saudação:**  
  `oi`, `oii`, `oie`, `olá`, `ola`, `alo`, `alô`, `e aí`, `eai`, `eaí`, `salve`, `opa`,  
  `hi`, `hello`, `hey`, `start`, `iniciar`, `começar`, `comecar`,  
  `bom dia`, `boa tarde`, `boa noite`, `dia`, `tarde`, `noite`,  
  `ajuda`, `help`, `socorro`, `?`, `??`, `menu`, `inicio`, `início`, `home`

- **Match por `startsWith` ou `includes` ao invés de `===`:**  
  Assim `"oi tudo bem?"`, `"bom diaa galera"`, `"ajuda por favor"` também disparam o menu.

- **Detecção de emojis comuns de saudação:**  
  `👋`, `🙋`, `🙋‍♂️`, `🙋‍♀️` → menu.

- **Mensagens curtas em chat individual** (≤ 3 caracteres como `oi`, `?`, `hi`, `eu`) → tratar como saudação e abrir o menu.

### 2. Comportamento em grupos (linha ~4498)
- Em **grupos**, NÃO enviar a mensagem `❓ Comando não reconhecido` para evitar poluir a conversa.
- Apenas responder em grupos quando: comando explícito for detectado, ticket for citado, ou houver wizard ativo.
- Em **chat individual**, manter a mensagem de erro mas sugerir digitar `menu` ou `ajuda`.

### 3. Adicionar `ajuda` como atalho global
Adicionar `ajuda` e `help` (sozinhos) como sinônimos de `menu` no `extractCommand`.

## ✅ Resultado Esperado
- Usuário digita `oi`, `bom dia`, `eai`, `ajuda`, `?` → bot já mostra o menu principal.
- Variações com pontuação/typos (`oii`, `bom diaa`, `oi!`) funcionam.
- Grupos ficam silenciosos para mensagens que não são comandos.
- Apenas o webhook é alterado — sem mudanças no banco ou no frontend.

## 📦 Arquivos Afetados
- `supabase/functions/whatsapp-webhook/index.ts` (deploy automático)
