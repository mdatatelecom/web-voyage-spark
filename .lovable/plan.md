

## Plano: Menu Monitoramento com Submenus Dinâmicos

### Situação Atual

Atualmente, o menu "Monitoramento" tem apenas um item fixo "Painéis" que abre uma página com abas internas. Isso não é ideal porque:
- Os painéis não aparecem diretamente no menu
- Precisa clicar em "Painéis" e depois escolher qual ver
- A configuração está dentro de uma aba, não em um submenu separado

---

### Nova Estrutura Proposta

```text
Menu Monitoramento
├── Visão Geral          → /monitoring (dashboard com todos painéis)
├── Configurações        → /monitoring/settings (gerenciar painéis)
├── ─────────────────── (separador dinâmico)
├── Dashboard Grafana    → /monitoring/panel/uuid-1 (webview direto)
├── Zabbix Principal     → /monitoring/panel/uuid-2 (webview direto)
└── Outro Painel         → /monitoring/panel/uuid-3 (webview direto)
```

---

### Alterações Necessárias

#### 1. AppLayout.tsx - Menu Dinâmico

**Problema**: O menu atual é estático com itens fixos.

**Solução**: Carregar os painéis do banco de dados e adicionar como submenus dinâmicos.

Modificações:
- Importar o hook `useMonitoringPanels`
- Modificar a seção `monitoring` do `menuGroups` para incluir painéis ativos
- Adicionar ícones diferenciados por tipo (Grafana/Zabbix/Outro)

#### 2. Novas Rotas em App.tsx

Adicionar rotas:
- `/monitoring` → Visão geral (já existe)
- `/monitoring/settings` → Página de configurações
- `/monitoring/panel/:id` → Visualização de painel individual em tela cheia

#### 3. Nova Página MonitoringPanelView.tsx

Criar uma página simples que:
- Recebe o ID do painel via URL
- Carrega os dados do painel
- Exibe o iframe em tela cheia (100% altura)
- Botões: Voltar, Atualizar, Abrir em Nova Aba

#### 4. Separar MonitoringSettings.tsx

Extrair a aba de configurações para uma página separada com acesso direto pelo menu.

---

### Arquivos a Modificar/Criar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/layout/AppLayout.tsx` | Modificar | Adicionar painéis dinâmicos ao menu |
| `src/App.tsx` | Modificar | Adicionar rotas `/monitoring/settings` e `/monitoring/panel/:id` |
| `src/pages/MonitoringDashboard.tsx` | Modificar | Remover aba settings, manter só visão geral |
| `src/pages/MonitoringSettings.tsx` | Criar | Página dedicada para configurações |
| `src/pages/MonitoringPanelView.tsx` | Criar | Visualização de painel individual em webview |

---

### Detalhes Técnicos

#### Menu Dinâmico no AppLayout

```typescript
// Dentro do menuGroups, modificar a seção 'monitoring':
{
  id: 'monitoring',
  label: 'Monitoramento',
  icon: Activity,
  visible: (isAdmin || isTechnician) && !isNetworkViewer,
  items: [
    { label: 'Visão Geral', icon: LayoutDashboard, path: '/monitoring', visible: true },
    { label: 'Configurações', icon: Settings, path: '/monitoring/settings', visible: isAdmin },
    // Separador visual + painéis dinâmicos:
    ...activePanels.map(panel => ({
      label: panel.name,
      icon: panel.panel_type === 'grafana' ? BarChart3 : 
            panel.panel_type === 'zabbix' ? AlertCircle : Monitor,
      path: `/monitoring/panel/${panel.id}`,
      visible: true,
    })),
  ],
}
```

#### Página de Visualização Individual

A nova página `MonitoringPanelView.tsx` terá:
- Header com nome do painel e botões de ação
- iframe ocupando toda a altura disponível
- Suporte a tela cheia nativa do navegador

---

### Fluxo do Usuário

1. Clica em "Monitoramento" no menu
2. Vê submenu com:
   - "Visão Geral" (todos os painéis em cards)
   - "Configurações" (gerenciar painéis - só admin)
   - Lista de painéis ativos (Dashboard Grafana, Zabbix, etc)
3. Clica diretamente no painel desejado
4. Abre página limpa com webview em tela cheia

---

### Considerações

- **Performance**: Os painéis são carregados uma vez e cacheados pelo React Query
- **Permissões**: Apenas admins podem acessar "Configurações"
- **Responsividade**: Menu colapsado mostra tooltip com nome do painel
- **Loading**: Skeleton enquanto carrega os painéis no menu

