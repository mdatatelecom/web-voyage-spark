## Módulo IA para Análise de Alertas Zabbix

Análise inteligente automática dos alertas Zabbix já recebidos pelo webhook existente, com tradução PT-BR, diagnóstico, comandos sugeridos, checklist e mensagem pronta para WhatsApp.

### Recomendação importante sobre IA

O sistema já tem **Lovable AI Gateway** (`LOVABLE_API_KEY`) configurado, com suporte nativo aos modelos Gemini (`google/gemini-2.5-flash`, `google/gemini-2.5-pro`, etc.) **sem precisar de chave do Google**, sem cobrança extra e sem aba de configuração de API key. Recomendo usar isso em vez de pedir a Gemini API key do usuário. Se mesmo assim preferir Gemini direto do Google, podemos adicionar a chave depois.

### Escopo da implementação

**1. Banco de dados** (migration)
- `ai_settings` — singleton: `model`, `temperature`, `max_tokens`, `prompt_template`, `enabled`, `auto_analyze` (analisar automaticamente novos alertas Zabbix), `updated_at`. RLS: leitura para autenticados, escrita só admin.
- `zabbix_ai_analysis` — `id`, `alert_id` (FK opcional para `alerts`), `host`, `trigger_name`, `severity`, `category` (linux/rede/mikrotik/camera/db/docker/vmware/outro), `priority` (baixa/média/alta/crítica), `original_alert` (jsonb), `summary`, `translation`, `causes` (jsonb), `commands` (jsonb), `checklist` (jsonb), `recommendations` (jsonb), `whatsapp_message`, `model_used`, `tokens_used`, `created_at`. RLS por papel (admin/technician leem; viewer não).

**2. Edge Functions**
- `analyze-zabbix-alert` — recebe `{ alert_id }` ou payload bruto, monta prompt com regras do usuário, chama Lovable AI Gateway (`google/gemini-2.5-flash` por padrão) usando **structured output** (schema JSON com summary, translation, causes, commands, checklist, recommendations, whatsapp_message, category, priority), persiste em `zabbix_ai_analysis` e retorna o resultado. Trata 429/402 com mensagens claras.
- `test-ai-connection` — chama o gateway com prompt mínimo para validar configuração e retorna OK/erro.
- Atualizar `zabbix-webhook` existente: após inserir o alerta, se `ai_settings.auto_analyze = true`, dispara `analyze-zabbix-alert` em background (fire-and-forget via `EdgeRuntime.waitUntil`).

**3. Frontend**

Nova rota **Configurações → IA Gemini** (`/settings/ai`, restrito a admin):
- Select de modelo (gemini-2.5-flash / 2.5-pro / 2.5-flash-lite)
- Sliders de temperatura e max tokens
- Textarea de prompt personalizado (com botão "Restaurar padrão")
- Toggle "Analisar alertas automaticamente"
- Status da conexão + botão **Testar conexão**

Nova rota **Análises IA** (`/ai-analyses`):
- Lista/cards de análises com filtros (host, severidade, categoria, período)
- Badge de severidade colorida + ícone por categoria (Linux/Rede/Mikrotik/Câmera/DB/Docker/VMware)
- Detalhe da análise com seções: Resumo, Tradução, Causas, Comandos (botão **Copiar**), Checklist, Recomendações, Mensagem WhatsApp (botão **Copiar** e **Enviar via WhatsApp** reutilizando integração existente)
- Botão "Reanalisar" e "Analisar manualmente" a partir de um alerta
- Histórico de incidentes semelhantes (match por host + trigger_name)
- Layout NOC/SOC, dark/light já suportados pelo design system

Integração no `ZabbixAlertsSection` e `AlertList`: botão "🧠 Analisar com IA" abrindo o resultado em dialog.

### Detalhes técnicos

```text
Webhook Zabbix → tabela alerts (já existe)
       ↓ (se auto_analyze)
analyze-zabbix-alert (edge fn)
       ↓
Lovable AI Gateway (gemini-2.5-flash) com structured output
       ↓
zabbix_ai_analysis (persiste)
       ↓
Frontend (lista + detalhe + WhatsApp)
```

- Structured output com `tool_choice` forçado garante JSON válido — sem parsing frágil.
- Categoria/prioridade vêm do próprio modelo via campos enumerados no schema.
- WhatsApp reutiliza `send-whatsapp` já existente.
- Restrições de acesso: configurações e reanálise = admin; visualização = admin/technician.

### Arquivos afetados (estimativa)

- `supabase/migrations/<novo>.sql`
- `supabase/functions/analyze-zabbix-alert/index.ts` (novo)
- `supabase/functions/test-ai-connection/index.ts` (novo)
- `supabase/functions/zabbix-webhook/index.ts` (gatilho automático)
- `supabase/config.toml` (registrar funções)
- `src/pages/AISettings.tsx`, `src/pages/AIAnalyses.tsx`, `src/pages/AIAnalysisDetails.tsx` (novos)
- `src/components/ai/*` — `AnalysisCard`, `CommandBlock`, `ChecklistList`, `WhatsAppPreview`, `CategoryIcon` (novos)
- `src/hooks/useAISettings.ts`, `src/hooks/useAIAnalyses.ts` (novos)
- `src/components/layout/AppLayout.tsx` (item de menu)
- `src/App.tsx` (rotas)
- `src/components/equipment/ZabbixAlertsSection.tsx` e `src/components/notifications/AlertList.tsx` (botão "Analisar com IA")

### Confirmações necessárias antes de implementar

1. **Provider de IA**: usar **Lovable AI Gateway com Gemini** (recomendado, sem API key) ou **Google Gemini direto** (precisa que você cadastre `GEMINI_API_KEY`)?
2. **Modo automático**: analisar **todo alerta Zabbix novo** automaticamente, ou só **sob demanda** clicando em "Analisar com IA"? (auto consome mais créditos)
3. **Aba de Configurações**: criar página separada `/settings/ai` ou adicionar dentro da página `System` existente?
