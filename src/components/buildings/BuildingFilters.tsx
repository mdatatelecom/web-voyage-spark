import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BUILDING_TYPES, BRAZILIAN_STATES } from '@/constants/locationTypes';
import { X } from 'lucide-react';

interface BuildingFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  buildingType: string;
  onBuildingTypeChange: (value: string) => void;
  state: string;
  onStateChange: (value: string) => void;
  city: string;
  onCityChange: (value: string) => void;
  internalCode: string;
  onInternalCodeChange: (value: string) => void;
  onClearFilters: () => void;
}

export function BuildingFilters({
  searchTerm,
  onSearchChange,
  buildingType,
  onBuildingTypeChange,
  state,
  onStateChange,
  city,
  onCityChange,
  internalCode,
  onInternalCodeChange,
  onClearFilters,
}: BuildingFiltersProps) {
  const hasActiveFilters = searchTerm || buildingType || state || city || internalCode;

  return (
    <div className="space-y-4">
      {/* Main search */}
      <Input
        placeholder="Buscar por nome..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-md"
      />

      {/* Advanced filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="text-sm font-medium mb-2 block">Tipo de Edificação</label>
          <Select value={buildingType} onValueChange={onBuildingTypeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Todos os tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {BUILDING_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[140px]">
          <label className="text-sm font-medium mb-2 block">Estado</label>
          <Select value={state} onValueChange={onStateChange}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {BRAZILIAN_STATES.map((st) => (
                <SelectItem key={st.value} value={st.value}>
                  {st.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[180px]">
          <label className="text-sm font-medium mb-2 block">Cidade</label>
          <Input
            placeholder="Filtrar por cidade"
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
          />
        </div>

        <div className="flex-1 min-w-[180px]">
          <label className="text-sm font-medium mb-2 block">Código Interno</label>
          <Input
            placeholder="Filtrar por código"
            value={internalCode}
            onChange={(e) => onInternalCodeChange(e.target.value)}
          />
        </div>

        {hasActiveFilters && (
          <Button
            variant="outline"
            onClick={onClearFilters}
            className="whitespace-nowrap"
          >
            <X className="mr-2 h-4 w-4" />
            Limpar Filtros
          </Button>
        )}
      </div>
    </div>
  );
}
