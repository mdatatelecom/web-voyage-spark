

# Corrigir Notificacoes de Grupo WhatsApp - Chamados

## Problema Identificado

Todas as notificacoes de grupo WhatsApp estao falhando com `error_message: [object Object]`. Isso afeta:
- Notificacoes de criacao/atualizacao de chamados
- Alertas Zabbix enviados para grupo
- Qualquer envio para grupo via `send-group`

O envio individual funciona (teste para numero individual teve sucesso).

## Causa Raiz

Na edge function `send-whatsapp/index.ts`, o tratamento de erros no bloco `send-group` nao serializa corretamente todos os cenarios de erro da Evolution API. Quando a API retorna um erro com estrutura inesperada, o objeto de erro e convertido para string via coercao implicita, resultando em `[object Object]`.

## Alteracoes

### 1. `supabase/functions/send-whatsapp/index.ts` - Bloco `send-group`

**Adicionar safeguard de serializacao no error_message (linha ~1175):**
```typescript
error_message: typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg),
```

**Adicionar logging detalhado para diagnostico (antes do parse de erro):**
```typescript
console.error('Evolution API send-group FULL error response:', JSON.stringify(errorData));
```

**Adicionar fallback para erros nao cobertos pelo parse atual:**
Apos a cadeia de `if/else if` (linha ~1165), adicionar:
```typescript
} else {
  // Fallback: serialize entire error response
  errorMsg = JSON.stringify(errorData) || `Erro ao enviar para grupo: ${response.status}`;
}
```

**Mesmo fix no catch block (linha ~1216):**
```typescript
error_message: typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage),
```

### 2. Mesma correcao no `send-group-media` (ja tem o safeguard na linha 1362, apenas validar)

### 3. Verificar envio real

Apos o deploy, invocar manualmente a edge function com action `test` para validar que a instancia `Mdata` esta conectada, e depois testar `send-group` com o grupo `120363424359487701@g.us`.

## Resumo

| Local | Alteracao |
|-------|----------|
| send-whatsapp L1175 | Safeguard `typeof` no error_message |
| send-whatsapp L1129-1165 | Log completo + fallback JSON.stringify |
| send-whatsapp L1216 | Safeguard no catch block |

