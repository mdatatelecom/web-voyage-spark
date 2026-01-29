

## Plano: Suporte a Imagens no Webhook EPI + Botão Ver Imagem

### Resumo

Adicionar suporte para receber imagens (base64 ou URL) no webhook do EPI Monitor, armazená-las no storage, e exibí-las nos alertas com um botão "Ver".

---

### Alterações Propostas

#### 1. Atualizar Interface e Processamento no Webhook

**Arquivo:** `supabase/functions/zabbix-webhook/index.ts`

Expandir a interface `EpiPayload` para incluir os novos campos:

```typescript
interface EpiPayload {
  test?: boolean;
  source?: string;
  message?: string;
  timestamp?: string;
  alert_type?: string;
  equipment_name?: string;
  employee_name?: string;
  severity?: string;
  due_date?: string;
  department?: string;
  // Novos campos
  camera?: string;
  risk?: string;
  image?: string;        // URL direta da imagem
  image_base64?: string; // Imagem em base64 (alternativa)
}
```

Adicionar lógica para processar imagens:

```text
1. Se `image_base64` presente:
   - Decodificar base64
   - Fazer upload para bucket 'public' em 'epi-alerts/{timestamp}-{uuid}.jpg'
   - Obter URL pública
   
2. Se `image` presente (URL):
   - Usar diretamente como image_url
   
3. Salvar `image_url` no metadata do alerta
```

#### 2. Criar Componente de Visualização de Imagem EPI

**Novo arquivo:** `src/components/alerts/EpiImageDialog.tsx`

Dialog modal para exibir a imagem do alerta EPI:

```text
┌──────────────────────────────────────────────┐
│ [X]        Screenshot EPI Alert              │
├──────────────────────────────────────────────┤
│                                              │
│   ┌────────────────────────────────────┐     │
│   │                                    │     │
│   │         [IMAGEM DO ALERTA]         │     │
│   │                                    │     │
│   └────────────────────────────────────┘     │
│                                              │
│   Câmera: Camera 2                           │
│   Risco: SEM CAPACETE                        │
│   Data: 29/01/2026 16:53                     │
│                                              │
│            [ Baixar Imagem ]                 │
└──────────────────────────────────────────────┘
```

#### 3. Adicionar Botão "Ver" no AlertList

**Arquivo:** `src/components/notifications/AlertList.tsx`

Adicionar botão "Ver" que aparece apenas para alertas EPI com imagem:

```typescript
// Verificar se alerta tem imagem
const hasImage = alert.type === 'epi_alert' && 
                 alert.metadata?.image_url;

// Adicionar botão Ver
{hasImage && (
  <Button
    variant="ghost"
    size="sm"
    className="h-7 text-xs text-amber-600 hover:text-amber-700"
    onClick={() => setSelectedAlert(alert)}
  >
    <Eye className="h-3 w-3 mr-1" />
    Ver
  </Button>
)}
```

Também exibir miniatura da imagem inline:

```text
┌─────────────────────────────────────────────────────────┐
│ 🦺 EPI Monitor                                          │
│ [EPI] SEM CAPACETE detectado na Camera 2                │
│ Alerta de segurança: SEM CAPACETE detectado...          │
│                                                         │
│ ┌──────────┐                                            │
│ │ [thumb]  │  [Ver] [Marcar como Lido] [Resolver]       │
│ └──────────┘                                            │
└─────────────────────────────────────────────────────────┘
```

#### 4. Atualizar EpiMonitorWidget com Miniatura

**Arquivo:** `src/components/dashboard/EpiMonitorWidget.tsx`

Adicionar miniatura da imagem no widget quando disponível:

```typescript
{alert.metadata?.image_url && (
  <img 
    src={alert.metadata.image_url} 
    alt="Screenshot EPI" 
    className="w-16 h-12 object-cover rounded border"
  />
)}
```

---

### Arquivos a Serem Modificados/Criados

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `supabase/functions/zabbix-webhook/index.ts` | Modificar | Adicionar campos à interface EpiPayload e lógica de upload de imagem |
| `src/components/alerts/EpiImageDialog.tsx` | Criar | Dialog para visualizar imagem do alerta EPI em tela cheia |
| `src/components/notifications/AlertList.tsx` | Modificar | Adicionar botão "Ver", miniatura e integração com EpiImageDialog |
| `src/components/dashboard/EpiMonitorWidget.tsx` | Modificar | Adicionar miniatura da imagem quando disponível |

---

### Fluxo de Dados

```text
EPI Monitor → Webhook → Upload Storage → Salvar URL no Metadata
                                              ↓
                                    AlertList/Widget
                                              ↓
                                    Botão "Ver" → Dialog com Imagem
```

### Formato do Payload Esperado

O webhook aceitará dois formatos de imagem:

**Opção 1 - URL direta:**
```json
{
  "timestamp": "2026-01-29 16:53:23",
  "camera": "Camera 2",
  "risk": "SEM CAPACETE",
  "message": "Alerta de segurança: SEM CAPACETE detectado",
  "image": "https://exemplo.com/screenshot.jpg"
}
```

**Opção 2 - Base64:**
```json
{
  "timestamp": "2026-01-29 16:53:23",
  "camera": "Camera 2",
  "risk": "SEM CAPACETE",
  "message": "Alerta de segurança detectado",
  "image_base64": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

---

### Resultado Visual Esperado

**Na Lista de Alertas:**
- Miniatura da imagem ao lado do alerta EPI
- Botão "Ver" com ícone de olho (Eye)
- Ao clicar, abre dialog com imagem em tamanho maior

**No Dashboard Widget:**
- Miniatura pequena ao lado de cada alerta com imagem
- Indicador visual quando alerta possui screenshot

