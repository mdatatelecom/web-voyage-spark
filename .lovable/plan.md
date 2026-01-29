
## Plano: Adaptar Webhook para Aceitar Integração EPI Monitor

### Contexto

O **EPI Monitor** (Monitoramento de EPIs/Equipamentos de Proteção Individual) está tentando enviar alertas para o endpoint `/functions/v1/zabbix-webhook`, mas o formato do payload é diferente do Zabbix tradicional.

### Opções de Implementação

#### Opção 1: Criar Webhook Dedicado para EPI (Recomendado)
Criar uma edge function separada `epi-webhook` específica para o EPI Monitor.

#### Opção 2: Adaptar Webhook Existente
Modificar o `zabbix-webhook` para aceitar ambos os formatos (Zabbix e EPI).

**Recomendação:** Opção 2 - Adaptar o webhook existente para manter centralizada a recepção de alertas externos.

---

### Alterações Propostas

**Arquivo:** `supabase/functions/zabbix-webhook/index.ts`

#### 1. Detectar Origem do Payload

Adicionar lógica para identificar se o payload vem do Zabbix ou do EPI Monitor:

```text
// Detectar origem do payload
const isEpiPayload = payload.test !== undefined || 
                     payload.source === 'epi_monitor' ||
                     (!payload.host && !payload.hostname && !payload.trigger && !payload.trigger_name);
```

#### 2. Interface para Payload EPI

Definir interface para aceitar campos do EPI Monitor:

```text
interface EpiPayload {
  test?: boolean;
  source?: string;
  message?: string;
  timestamp?: string;
  alert_type?: string;       // tipo de alerta (vencimento, pendência, etc)
  equipment_name?: string;   // nome do EPI
  employee_name?: string;    // nome do funcionário
  severity?: string;         // severidade (info, warning, critical)
  due_date?: string;         // data de vencimento
  department?: string;       // departamento
}
```

#### 3. Processar Payloads EPI

Adicionar bloco para processar alertas do EPI Monitor antes da validação Zabbix:

```text
if (isEpiPayload) {
  // Se é apenas teste, retornar sucesso
  if (payload.test) {
    console.log('EPI Monitor test payload received successfully');
    return Response.json({ 
      success: true, 
      message: 'Conexão com EPI Monitor estabelecida com sucesso',
      received_at: new Date().toISOString()
    });
  }

  // Processar alerta real do EPI
  const epiSeverity = mapEpiSeverity(payload.severity);
  const title = `[EPI] ${payload.alert_type || payload.message || 'Alerta EPI Monitor'}`;
  const detailedMessage = [
    payload.message,
    payload.equipment_name ? `EPI: ${payload.equipment_name}` : '',
    payload.employee_name ? `Funcionário: ${payload.employee_name}` : '',
    payload.department ? `Departamento: ${payload.department}` : '',
    payload.due_date ? `Vencimento: ${payload.due_date}` : '',
  ].filter(Boolean).join(' | ');

  // Inserir alerta no banco
  const { data: alertData, error } = await supabase
    .from('alerts')
    .insert({
      type: 'epi_alert',
      severity: epiSeverity,
      status: 'active',
      title,
      message: detailedMessage,
      metadata: {
        source: 'epi_monitor',
        ...payload
      }
    })
    .select()
    .single();

  // Enviar notificação WhatsApp se configurado
  // ... lógica similar à do Zabbix
}
```

#### 4. Adicionar Tipo de Alerta EPI

Atualizar o ENUM `alert_type` ou usar o valor 'epi_alert' diretamente.

---

### Fluxo de Processamento

```text
Requisição recebida
       ↓
Detectar origem (Zabbix ou EPI?)
       ↓
    ┌─────────────────┬─────────────────┐
    │ EPI Monitor     │ Zabbix          │
    ↓                 ↓                 
É teste?          Validar campos
    ↓                 ↓
Sim → Retornar OK  Criar alerta + 
                   WhatsApp
    ↓
Não → Criar alerta
      + WhatsApp
```

---

### Campos Esperados do EPI Monitor

Para alertas reais (não teste), o EPI Monitor deve enviar:

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| `source` | Sim | `"epi_monitor"` para identificar origem |
| `message` | Sim | Descrição do alerta |
| `alert_type` | Não | Tipo: `vencimento`, `pendencia`, `irregularidade` |
| `severity` | Não | `info`, `warning`, `critical` (default: warning) |
| `equipment_name` | Não | Nome do EPI |
| `employee_name` | Não | Nome do funcionário |
| `department` | Não | Departamento |
| `due_date` | Não | Data de vencimento (ISO 8601) |
| `timestamp` | Não | Timestamp do evento |

---

### Exemplo de Payload EPI Monitor (Real)

```json
{
  "source": "epi_monitor",
  "alert_type": "vencimento",
  "message": "EPI próximo do vencimento",
  "severity": "warning",
  "equipment_name": "Capacete de Segurança",
  "employee_name": "João Silva",
  "department": "Manutenção",
  "due_date": "2026-02-15",
  "timestamp": "2026-01-29T19:20:00Z"
}
```

---

### Configurações de Notificação

Adicionar novas configurações em `alert_settings`:

| Chave | Valor Padrão | Descrição |
|-------|--------------|-----------|
| `epi_enabled` | 1 | Habilitar integração EPI Monitor |
| `epi_whatsapp_enabled` | 1 | Enviar notificações WhatsApp para alertas EPI |
| `epi_min_severity` | 2 | Severidade mínima para notificar (1=info, 2=warning, 3=critical) |

---

### Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/zabbix-webhook/index.ts` | Detectar e processar payloads do EPI Monitor |
| Migração SQL | Adicionar configurações `epi_*` em `alert_settings` |

---

### Resultado Esperado

Após implementação:
- Payloads de teste do EPI Monitor retornarão sucesso imediato
- Alertas reais do EPI Monitor serão criados na tabela `alerts` com tipo `epi_alert`
- Notificações WhatsApp serão enviadas respeitando configurações
- Alertas EPI aparecerão no Dashboard e páginas de alerta
- Histórico WhatsApp mostrará notificações do tipo EPI
