import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter, X } from 'lucide-react';
import { useDashboardFilters } from '@/hooks/useDashboardFilters';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DashboardFiltersProps {
  onFiltersChange?: (filters: any) => void;
}

export const DashboardFilters = ({ onFiltersChange }: DashboardFiltersProps) => {
  const {
    filters,
    updateDateRange,
    updateLocation,
    updateConnectionStatus,
    updateEquipmentType,
    clearFilters,
    hasActiveFilters,
  } = useDashboardFilters();

  // Fetch buildings for location filter
  const { data: buildings } = useQuery({
    queryKey: ['buildings-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buildings')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const handleClearFilters = () => {
    clearFilters();
    onFiltersChange?.(null);
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold">Filtros</h3>
        {hasActiveFilters && (
          <Badge variant="secondary" className="ml-auto">
            Filtros ativos
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Date Range Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">Período</label>
          <Select
            value={
              filters.dateRange.from
                ? 'custom'
                : 'all'
            }
            onValueChange={(value) => {
              const today = new Date();
              if (value === '7days') {
                const from = new Date(today);
                from.setDate(today.getDate() - 7);
                updateDateRange(from, today);
              } else if (value === '30days') {
                const from = new Date(today);
                from.setDate(today.getDate() - 30);
                updateDateRange(from, today);
              } else if (value === '90days') {
                const from = new Date(today);
                from.setDate(today.getDate() - 90);
                updateDateRange(from, today);
              } else {
                updateDateRange(undefined, undefined);
              }
              onFiltersChange?.(filters);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos os períodos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="7days">Últimos 7 dias</SelectItem>
              <SelectItem value="30days">Últimos 30 dias</SelectItem>
              <SelectItem value="90days">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Location Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">Localização</label>
          <Select
            value={filters.location.buildingId || 'all'}
            onValueChange={(value) => {
              updateLocation(value === 'all' ? {} : { buildingId: value });
              onFiltersChange?.(filters);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos os prédios" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os prédios</SelectItem>
              {buildings?.map((building) => (
                <SelectItem key={building.id} value={building.id}>
                  {building.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Connection Status Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">Status da Conexão</label>
          <Select
            value={filters.connectionStatus || 'all'}
            onValueChange={(value) => {
              updateConnectionStatus(value === 'all' ? undefined : value);
              onFiltersChange?.(filters);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativa</SelectItem>
              <SelectItem value="inactive">Inativa</SelectItem>
              <SelectItem value="testing">Testando</SelectItem>
              <SelectItem value="faulty">Defeituosa</SelectItem>
              <SelectItem value="reserved">Reservada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Equipment Type Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">Tipo de Equipamento</label>
          <Select
            value={filters.equipmentType || 'all'}
            onValueChange={(value) => {
              updateEquipmentType(value === 'all' ? undefined : value);
              onFiltersChange?.(filters);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos os tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="switch">Switch</SelectItem>
              <SelectItem value="router">Router</SelectItem>
              <SelectItem value="server">Server</SelectItem>
              <SelectItem value="patch_panel">Patch Panel</SelectItem>
              <SelectItem value="firewall">Firewall</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="mt-4 flex justify-end">
          <Button variant="outline" size="sm" onClick={handleClearFilters}>
            <X className="h-4 w-4 mr-2" />
            Limpar Filtros
          </Button>
        </div>
      )}
    </Card>
  );
};
