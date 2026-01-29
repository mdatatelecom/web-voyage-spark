

## Plano: Widget EPI Monitor no Dashboard + Filtro EPI na Página de Alertas

### Resumo

Adicionar um novo widget no Dashboard para mostrar alertas do EPI Monitor em destaque, e incluir opção de filtro "EPI" na página de Alertas.

---

### Alterações Propostas

#### 1. Criar Widget EPI Monitor para o Dashboard

**Novo arquivo:** `src/components/dashboard/EpiMonitorWidget.tsx`

Componente visual similar ao `ZabbixMonitoringWidget`, com:
- Ícone de identificação: `HardHat` ou `Shield` do Lucide
- Cores temáticas: laranja/âmbar (diferente do roxo do Zabbix)
- Exibição dos últimos 3 alertas EPI ativos
- Contadores de alertas críticos e avisos
- Botão "Ver Todos os Alertas EPI" direcionando para `/alerts?type=epi`
- Estado vazio quando não há alertas EPI

Estrutura visual:
```text
┌─────────────────────────────────────────────┐
│ 🦺 Monitoramento EPI          [2 críticos]  │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ ⚠ EPI próximo do vencimento             │ │
│ │   Capacete - João Silva - Manutenção    │ │
│ │   há 2 minutos                     [>]  │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ ⚠ Risco detectado                       │ │
│ │   Sem óculos de proteção - Câmera 5     │ │
│ │   há 5 minutos                     [>]  │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│   [ Ver Todos os Alertas EPI (5) ]          │
└─────────────────────────────────────────────┘
```

#### 2. Integrar Widget no Dashboard

**Arquivo:** `src/pages/Dashboard.tsx`

Adicionar o widget EPI na seção de "Alertas do Sistema", logo após o `ZabbixMonitoringWidget`:

```text
{/* Widget de Monitoramento EPI */}
<div>
  <div className="mb-3 flex items-center gap-2">
    <Activity className="h-4 w-4 text-muted-foreground" />
    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
      Segurança do Trabalho
    </h3>
  </div>
  <EpiMonitorWidget />
</div>
```

#### 3. Atualizar Hook useAlerts

**Arquivo:** `src/hooks/useAlerts.ts`

Adicionar `epi_alert` à tipagem `AlertType`:

```typescript
export type AlertType = 
  | 'rack_capacity' 
  | 'port_capacity' 
  | 'equipment_failure' 
  | 'poe_capacity'
  | 'nvr_full'
  | 'camera_unassigned'
  | 'connection_faulty'
  | 'connection_stale_testing'
  | 'equipment_no_ip'
  | 'zabbix_alert'
  | 'epi_alert';  // NOVO
```

#### 4. Adicionar Filtro EPI na Página de Alertas

**Arquivo:** `src/pages/Alerts.tsx`

Atualizar o tipo de filtro e adicionar opção EPI:

```typescript
type AlertTypeFilter = 'all' | 'capacity' | 'audit' | 'zabbix' | 'epi';

// No getTypeFilterValue():
case 'epi':
  return 'epi_alert';

// No getTypeFilterLabel():
case 'epi':
  return 'EPI Monitor';
```

Adicionar item no Select de filtro:
```text
<SelectItem value="epi">
  <span className="flex items-center gap-2">
    <HardHat className="w-4 h-4" />
    EPI Monitor
  </span>
</SelectItem>
```

#### 5. Atualizar AlertList para Suportar Tipo EPI

**Arquivo:** `src/components/notifications/AlertList.tsx`

Adicionar ícone e label para alertas EPI:

```typescript
// Em getSeverityIcon():
case 'epi_alert':
  return <HardHat className={cn("h-4 w-4", 
    severity === 'critical' ? 'text-destructive' : 
    severity === 'warning' ? 'text-amber-500' : 'text-blue-500'
  )} />;

// Em getAlertTypeLabel():
case 'epi_alert':
  return 'EPI Monitor';
```

---

### Arquivos a Serem Modificados/Criados

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/dashboard/EpiMonitorWidget.tsx` | Criar | Widget de alertas EPI para o Dashboard |
| `src/pages/Dashboard.tsx` | Modificar | Importar e adicionar EpiMonitorWidget |
| `src/hooks/useAlerts.ts` | Modificar | Adicionar `epi_alert` ao tipo AlertType |
| `src/pages/Alerts.tsx` | Modificar | Adicionar filtro "EPI" no dropdown |
| `src/components/notifications/AlertList.tsx` | Modificar | Adicionar ícone e label para epi_alert |

---

### Resultado Visual Esperado

**Dashboard:**
- Novo widget "Segurança do Trabalho" com alertas EPI em destaque
- Cores âmbar/laranja para diferenciar do Zabbix (roxo)
- Atualização em tempo real via subscription existente

**Página de Alertas:**
- Novo filtro "EPI Monitor" no dropdown de tipos
- Ícone de capacete (HardHat) identificando o tipo
- Funcionamento consistente com outros filtros existentes

