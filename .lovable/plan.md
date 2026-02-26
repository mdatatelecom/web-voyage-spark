

# Corrigir Filtros do Dashboard - Conexao Completa

## Problema Identificado

Os filtros do dashboard estao conectados apenas aos 4 graficos de infraestrutura (Rack Occupancy, Equipment Type, Connection Status, Port Usage). Os seguintes componentes **NAO reagem** aos filtros:

1. **MetricsWidget** - Os contadores (Predios, Racks, Equipamentos, Conexoes, Portas) usam uma query `dashboard-stats` que ignora os filtros
2. **CriticalAlertsWidget** - Nao recebe filtros
3. **ZabbixMonitoringWidget** - Nao recebe filtros
4. **EpiMonitorWidget** - Nao recebe filtros
5. **TicketStatsCards / SLAWidget / Ticket Charts** - Nao recebem filtros

## Plano de Correcao

### 1. Atualizar a query `dashboard-stats` para usar filtros

A query na linha 76-92 do `Dashboard.tsx` faz `select('count')` sem nenhum filtro. Quando o usuario seleciona um predio, os contadores devem refletir apenas dados daquele predio.

- Extrair essa query para um hook `useDashboardCounts(filters)` no `useDashboardStats.ts`
- Quando `buildingId` estiver definido, filtrar racks por predio (via floors/rooms), equipamentos por racks filtrados, conexoes por portas dos equipamentos filtrados
- Incluir `statsFilters` na queryKey para re-fetch automatico

### 2. Passar filtros para widgets de monitoramento

- `CriticalAlertsWidget`, `ZabbixMonitoringWidget`, `EpiMonitorWidget`: Adicionar prop `filters` opcional
- Quando `buildingId` estiver definido, filtrar alertas que pertencem a equipamentos/racks daquele predio
- Se nao houver filtro, manter comportamento atual

### 3. Garantir reatividade correta

- Verificar que todas as queryKeys incluem os parametros de filtro relevantes
- Remover `staleTime: 5 * 60 * 1000` ou reduzir para garantir atualizacao mais rapida quando filtros mudam

---

## Detalhes Tecnicos

### Arquivo: `src/hooks/useDashboardStats.ts`

Adicionar novo hook:
```typescript
export const useDashboardCounts = (filters?: DashboardStatsFilters) => {
  return useQuery({
    queryKey: ['dashboard-stats', filters?.buildingId, filters?.connectionStatus, filters?.equipmentType],
    queryFn: async () => {
      if (!filters?.buildingId) {
        // Sem filtro: contagem total (comportamento atual)
        const [buildings, racks, equipment, connections] = await Promise.all([...]);
        return { buildings, racks, equipment, connections };
      }
      // Com filtro de predio: contar apenas recursos daquele predio
      const rackIds = await getBuildingRackIds(filters.buildingId);
      const equipmentIds = await getBuildingEquipmentIds(filters.buildingId);
      // Contar connections filtradas por portas dos equipamentos
      return { buildings: 1, racks: rackIds.length, equipment: equipmentIds.length, connections: filteredCount };
    }
  });
};
```

### Arquivo: `src/pages/Dashboard.tsx`

- Substituir a query inline `dashboard-stats` pelo novo hook `useDashboardCounts(statsFilters)`
- Passar `statsFilters` para `CriticalAlertsWidget`, `ZabbixMonitoringWidget`, `EpiMonitorWidget`

### Arquivos de Widgets (CriticalAlertsWidget, ZabbixMonitoringWidget, EpiMonitorWidget)

- Adicionar prop `filters?: DashboardStatsFilters`
- Filtrar alertas pelo `buildingId` quando presente (via entity_id dos alertas que referenciam equipamentos/racks)

