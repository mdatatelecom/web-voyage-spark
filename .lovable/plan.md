## Atualizar prompt do sistema da IA Zabbix

Substituir o `prompt_template` padrão da IA pelo prompt detalhado fornecido (especialista em Linux/Redes/CFTV/Mikrotik/Zabbix), com formato de saída padronizado em PT-BR e regras adicionais (nível do incidente, causa raiz, correlações).

### Mudanças

**1. `src/pages/AISettings.tsx`**
- Substituir a constante `DEFAULT_PROMPT` pelo novo prompt completo enviado pelo usuário (regras + padrão de resposta + formato obrigatório).
- Botão "Restaurar padrão" passa a aplicar o novo texto.

**2. Banco de dados — `ai_settings`**
- Migration `UPDATE` no registro singleton para gravar o novo `prompt_template`, garantindo que a IA já use o novo prompt sem precisar do usuário clicar em "Restaurar padrão" + "Salvar".

**3. `supabase/functions/analyze-zabbix-alert/index.ts`**
- Ajuste mínimo no schema da tool `submit_analysis` para reforçar (via `description`) que todos os campos devem ser em **PT-BR** e que `whatsapp_message` deve seguir o template visual com separadores `━━━` e emojis (🚨 🕒 🌐 📍 🔥 📡 📈 📌 📖 ⚠️ 🔍 💻 📊 🎥 ✅ 📲).
- Adicionar campos opcionais ao schema: `incident_level` (`baixo|medio|alto|critico`) e `operational_impact` (string), persistidos em `original_alert.meta` ou — se você preferir — em colunas novas (ver pergunta 2).

### Pontos a confirmar antes de implementar

1. **Persistência do nível do incidente**: criar colunas dedicadas `incident_level` e `operational_impact` em `zabbix_ai_analysis` (mais limpo, filtrável) ou só embutir no `summary`/`whatsapp_message`?
2. **Reanalisar histórico**: deseja um botão "Reanalisar com novo prompt" para reprocessar análises antigas, ou o novo prompt vale só para alertas futuros?

### Arquivos afetados

- `src/pages/AISettings.tsx` (DEFAULT_PROMPT)
- `supabase/migrations/<novo>.sql` (UPDATE em `ai_settings`)
- `supabase/functions/analyze-zabbix-alert/index.ts` (descrições do schema + opcional `incident_level`/`operational_impact`)
- `supabase/migrations/<novo>.sql` (ALTER TABLE se confirmar pergunta 1)
