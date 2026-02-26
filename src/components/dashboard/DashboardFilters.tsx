import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Filter, X, ChevronDown } from 'lucide-react';
import { useDashboardFilters, DashboardFilters as DashboardFiltersType } from '@/hooks/useDashboardFilters';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface DashboardFiltersProps {
  onFiltersChange?: (filters: DashboardFiltersType | null) => void;
}

export const DashboardFilters = ({ onFiltersChange }: DashboardFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('all');
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

  // Notify parent whenever filters change
  useEffect(() => {
    if (hasActiveFilters) {
      onFiltersChange?.(filters);
    } else {
      onFiltersChange?.(null);
    }
  }, [filters]);

  const handleClearFilters = () => {
    clearFilters();
    setSelectedPeriod('all');
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center gap-3">
        <CollapsibleTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={cn(
              "gap-2",
              hasActiveFilters && "border-primary text-primary"
            )}
          >
            <Filter className="h-4 w-4" />
            Filtros
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                Ativos
              </Badge>
            )}
            <ChevronDown className={cn(
              "h-4 w-4 transition-transform",
              isOpen && "rotate-180"
            )} />
          </Button>
        </CollapsibleTrigger>
        
        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleClearFilters}
            className="gap-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
            Limpar
          </Button>
        )}
      </div>

      <CollapsibleContent className="mt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-lg border border-primary/30 bg-card">
          {/* Date Range Filter */}
          <div>
            <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Período</label>
            <Select
              value={selectedPeriod}
              onValueChange={(value) => {
                setSelectedPeriod(value);
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
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todos" />
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
            <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Localização</label>
            <Select
              value={filters.location.buildingId || 'all'}
              onValueChange={(value) => {
                updateLocation(value === 'all' ? {} : { buildingId: value });
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todos" />
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
            <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Status Conexão</label>
            <Select
              value={filters.connectionStatus || 'all'}
              onValueChange={(value) => {
                updateConnectionStatus(value === 'all' ? undefined : value);
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todos" />
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
            <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Tipo Equipamento</label>
            <Select
              value={filters.equipmentType || 'all'}
              onValueChange={(value) => {
                updateEquipmentType(value === 'all' ? undefined : value);
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todos" />
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
      </CollapsibleContent>
    </Collapsible>
  );
};
