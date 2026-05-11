## 1. Truncar `whatsapp_message` da IA com limite configurável

### Schema
Adicionar coluna em `ai_settings`:
```sql
ALTER TABLE public.ai_settings
  ADD COLUMN IF NOT EXISTS whatsapp_max_length integer NOT NULL DEFAULT 3500;
```
Limite default 3500 (WhatsApp aceita ~4096; deixa margem para sufixo de truncamento).

### UI — `src/pages/AISettings.tsx`
Novo campo `Input type="number"` (mín 500, máx 4096) ao lado de "Limite de tokens": **"Tamanho máximo da mensagem WhatsApp (caracteres)"**.

### Hook — `src/hooks/useAISettings.ts`
Incluir `whatsapp_max_length` no tipo `AISettings` e no payload de `update`.

### Webhook — `supabase/functions/zabbix-webhook/index.ts`
Após obter `aiWhatsAppMessage`:

```ts
function safeTruncateWhatsApp(msg: string, max: number): string {
  if (msg.length <= max) return msg;
  // Cortar em uma quebra de linha próxima para preservar formatação
  const slice = msg.slice(0, max - 30);
  const lastBreak = Math.max(slice.lastIndexOf('\n\n'), slice.lastIndexOf('\n'));
  const cut = lastBreak > max * 0.7 ? slice.slice(0, lastBreak) : slice;
  return cut.trimEnd() + '\n\n_…mensagem truncada_';
}
```

Buscar `whatsapp_max_length` junto com `enabled, auto_analyze` (mesma query) e aplicar:
```ts
aiWhatsAppMessage = safeTruncateWhatsApp(msg.trim(), aiSettings.whatsapp_max_length ?? 3500);
```

A função preserva os separadores `━━━` e blocos do template porque corta em quebras de linha.

## 2. Botão "Voltar" em `/system/ai`

Em `src/pages/AISettings.tsx`, adicionar antes do título:

```tsx
<Button variant="ghost" size="sm" onClick={() => navigate('/system')}>
  <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
</Button>
```

Importar `useNavigate` de `react-router-dom` e `ArrowLeft` de `lucide-react`. Destino fixo `/system` (página pai do módulo de configurações), consistente com o padrão das outras telas de settings.

## Arquivos alterados

- `supabase/migrations/<nova>.sql` — coluna `whatsapp_max_length`
- `src/hooks/useAISettings.ts` — tipo + update
- `src/pages/AISettings.tsx` — campo do limite + botão voltar
- `supabase/functions/zabbix-webhook/index.ts` — função `safeTruncateWhatsApp` e uso

## Verificação

- Abrir `/system/ai`: novo campo aparece com 3500, botão "Voltar" leva para `/system`.
- Disparar alerta longo no Zabbix → log `Mensagem WhatsApp da IA obtida (N chars)` deve refletir N ≤ limite, e o WhatsApp recebe sufixo `…mensagem truncada` quando aplicável.
