import { useState, useCallback } from 'react';

export interface WidgetConfig {
  id: string;
  title: string;
  visible: boolean;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'alerts', title: 'Alertas Críticos', visible: true },
  { id: 'metrics', title: 'Métricas Gerais', visible: true },
  { id: 'rackOccupancy', title: 'Ocupação de Racks', visible: true },
  { id: 'equipmentTypes', title: 'Tipos de Equipamento', visible: true },
  { id: 'connectionStatus', title: 'Status de Conexões', visible: true },
  { id: 'portUsage', title: 'Uso de Portas', visible: true },
  { id: 'quickAccess', title: 'Acesso Rápido', visible: true },
];

export const useDashboardLayout = () => {
  const [widgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS);
  const visibleWidgets = widgets.filter((w) => w.visible);

  return {
    widgets,
    visibleWidgets,
  };
};
