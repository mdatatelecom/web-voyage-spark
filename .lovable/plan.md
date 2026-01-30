

## Plano: Redesign Profissional do Dashboard

### Análise do Layout Atual

O dashboard atual possui boa estrutura, mas pode ser otimizado para:
- Melhor hierarquia visual
- Agrupamento lógico de informações
- Melhor aproveitamento do espaço
- Layout mais compacto e profissional

---

### Problemas Identificados

| Problema | Descrição |
|----------|-----------|
| Seções repetitivas | 3 widgets de monitoramento separados com labels repetidas |
| Filtros ocupam muito espaço | Card de filtros pode ser colapsível |
| Widgets de alerta desalinhados | Zabbix e EPI deveriam estar lado a lado |
| Falta de priorização | Métricas importantes não estão destacadas |
| Espaço desperdiçado | Quick Access e gráficos podem ser mais compactos |

---

### Nova Estrutura Proposta

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│ HEADER (manter como está - já está profissional)                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────────────────────────┐   │
│ │ Hero Section: "Painel de Controle" + Data/hora atual                      │   │
│ └───────────────────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────────────┤
│ SEÇÃO 1: MÉTRICAS RÁPIDAS (grid 5 colunas)                                      │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                │
│ │Locais    │ │Racks     │ │Equips    │ │Conexões  │ │Portas    │                │
│ │  42      │ │  128     │ │  1,847   │ │  2,391   │ │  3,420   │                │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘                │
├─────────────────────────────────────────────────────────────────────────────────┤
│ SEÇÃO 2: MONITORAMENTO E ALERTAS (grid 3 colunas iguais)                        │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐                     │
│ │ Alertas Sistema │ │ Zabbix Monitor  │ │ Segurança EPI   │                     │
│ │ (críticos +     │ │ (alertas de     │ │ (alertas de     │                     │
│ │  warnings)      │ │  monitoramento) │ │  trabalho)      │                     │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│ SEÇÃO 3: ACESSO RÁPIDO (compacto - 2 linhas de 5 botões cada)                   │
│ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐                               │
│ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│ SEÇÃO 4: ANÁLISE DE INFRAESTRUTURA (grid 2x2)                                   │
│ ┌─────────────────────────────┐ ┌─────────────────────────────┐                 │
│ │ Ocupação de Racks (bar)     │ │ Tipos de Equipamento (pie)  │                 │
│ └─────────────────────────────┘ └─────────────────────────────┘                 │
│ ┌─────────────────────────────┐ ┌─────────────────────────────┐                 │
│ │ Status de Conexões (bar)    │ │ Uso de Portas (stacked bar) │                 │
│ └─────────────────────────────┘ └─────────────────────────────┘                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│ SEÇÃO 5: CENTRO DE SUPORTE                                                      │
│ ┌───────────────┐ ┌─────────────────────────────────────────────────────────┐   │
│ │ Performance   │ │ Cards de Status (Abertos, Em Andamento, Resolvidos...)  │   │
│ │ SLA Widget    │ │                                                         │   │
│ └───────────────┘ └─────────────────────────────────────────────────────────┘   │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────┐                 │
│ │ Por Categoria   │ │ Por Técnico     │ │ Tendência           │                 │
│ └─────────────────┘ └─────────────────┘ └─────────────────────┘                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

### Alterações Detalhadas

#### 1. Hero Section Aprimorado
- Adicionar data/hora atual
- Manter título e descrição
- Remover labels repetitivas das seções

#### 2. Nova Seção de Métricas (linha única)
- Unificar MetricsWidget + Card de Portas em uma única linha
- 5 cards compactos side-by-side
- Design mais moderno com gradientes sutis

#### 3. Widgets de Monitoramento em Grid 3 Colunas
- CriticalAlertsWidget, ZabbixMonitoringWidget, EpiMonitorWidget
- Lado a lado com altura igual
- Remover labels "Monitoramento Externo" e "Segurança do Trabalho" (redundante com título do card)

#### 4. Quick Access Mais Compacto
- Reduzir padding
- Grid responsivo 5x2 → 10x1 em telas grandes
- Ícones menores e mais elegantes

#### 5. Gráficos Padronizados
- Remover Cards wrapper duplicados (os charts já têm)
- Padronizar altura dos gráficos (250px)
- Adicionar hover effects consistentes

#### 6. Filtros Colapsíveis (Opcional)
- Transformar em dropdown/collapsible
- Mostrar apenas quando necessário
- Manter funcionalidade atual

---

### Arquivos a Serem Modificados

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/pages/Dashboard.tsx` | Modificar | Reorganizar layout, remover duplicações, unificar seções |
| `src/components/dashboard/MetricsWidget.tsx` | Modificar | Converter para layout horizontal (5 cards em linha) |
| `src/components/dashboard/QuickAccessWidget.tsx` | Modificar | Layout mais compacto |
| `src/components/dashboard/DashboardFilters.tsx` | Modificar | Transformar em collapsible |

---

### Melhorias Visuais

1. **Espaçamento consistente**: gap-6 entre seções principais
2. **Cores harmoniosas**: usar cores do sistema de forma coerente
3. **Sombras sutis**: hover:shadow-lg para interatividade
4. **Bordas suaves**: border-border/50 para elegância
5. **Gradientes leves**: from-card to-primary/5 para depth
6. **Tipografia hierárquica**: títulos maiores, descrições menores

---

### Resultado Esperado

- Dashboard 30% mais compacto verticalmente
- Informações críticas visíveis sem scroll
- Layout responsivo aprimorado
- Visual profissional e moderno
- Melhor UX com agrupamento lógico

