

## Plano: Testar Exibição de Imagens no Webhook EPI

### Diagnóstico

A análise dos logs e banco de dados confirma:

| Verificação | Resultado |
|-------------|-----------|
| Webhook processando payloads | ✅ Funcionando |
| Campo `image` no payload | ❌ Sempre `null` |
| Campo `image_base64` no payload | ❌ Não enviado |
| `image_url` no metadata do alerta | ❌ Não existe |
| Placeholder "Sem imagem" | ✅ Exibindo corretamente |

**Conclusão**: O problema é que o **EPI Monitor não está enviando imagens** nos payloads. O código está pronto, mas sem dados.

---

### Opções de Ação

#### Opção 1: Testar o Webhook com Imagem Real (Recomendado)

Enviar um payload de teste para o webhook com uma imagem para verificar se todo o fluxo funciona:

**Payload de teste com URL:**
```json
{
  "timestamp": "2026-01-29 17:30:00",
  "camera": "Camera Teste",
  "risk": "TESTE COM IMAGEM",
  "message": "Teste de alerta EPI com screenshot",
  "image": "https://picsum.photos/640/480"
}
```

**Payload de teste com Base64:**
```json
{
  "timestamp": "2026-01-29 17:30:00",
  "camera": "Camera Teste",
  "risk": "TESTE BASE64",
  "message": "Teste de alerta EPI com imagem base64",
  "image_base64": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

#### Opção 2: Verificar Configuração do EPI Monitor

Verificar se o sistema EPI Monitor:
- Tem opção para enviar screenshots
- Está configurado para incluir imagens nos alertas
- Usa nome de campo diferente (ex: `screenshot`, `foto`, `anexo`)

#### Opção 3: Adicionar Suporte a Campos Alternativos

Expandir o webhook para aceitar outros nomes de campo que o EPI Monitor possa usar:
- `screenshot`
- `foto`
- `anexo`
- `imagem`

---

### Proposta de Implementação

1. **Adicionar suporte a campos alternativos de imagem no webhook**:
   ```typescript
   // Buscar imagem em vários campos possíveis
   const imageField = epiPayload.image || 
                      epiPayload.screenshot || 
                      epiPayload.foto || 
                      epiPayload.anexo || 
                      epiPayload.imagem;
   
   const base64Field = epiPayload.image_base64 || 
                       epiPayload.screenshot_base64 || 
                       epiPayload.foto_base64;
   ```

2. **Adicionar logging detalhado** para identificar todos os campos recebidos:
   ```typescript
   console.log('All payload fields:', Object.keys(epiPayload));
   ```

---

### Arquivos a Serem Modificados

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `supabase/functions/zabbix-webhook/index.ts` | Modificar | Adicionar suporte a campos alternativos de imagem e logging detalhado |

---

### Formato do Payload Aceito Após Alteração

O webhook passará a aceitar imagens em qualquer um destes campos:

**Para URL direta:**
- `image`
- `screenshot`
- `foto`
- `anexo`
- `imagem`

**Para Base64:**
- `image_base64`
- `screenshot_base64`
- `foto_base64`

