import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Edit, Trash2, Package, Cable, Ruler, Weight, Server } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Equipment {
  id: string;
  name: string;
  type: string;
  position_u_start: number;
  position_u_end: number;
  manufacturer?: string;
  model?: string;
}

interface Annotation {
  id: string;
  title: string;
  annotation_type: string;
  position_u: number;
  position_side: string;
  priority?: string;
}

interface Measurements {
  occupiedUs: number;
  availableUs: number;
  occupancyPercentage: number;
  rackHeightM: number;
  estimatedWeightKg: number;
  availableRanges: string[];
}

interface Rack3DPanelProps {
  isOpen: boolean;
  sizeU: number;
  equipment: Equipment[];
  annotations: Annotation[];
  measurements: Measurements;
  connections: number;
  tourActive: boolean;
  tourIndex: number;
  onAnnotationEdit: (annotation: Annotation) => void;
  onAnnotationDelete: (id: string) => void;
  onEquipmentClick?: (equipment: Equipment) => void;
}

const iconByType: Record<string, string> = {
  attention: '⚠️',
  maintenance: '🔧',
  note: '📝',
  warning: '🚨',
  info: 'ℹ️'
};

export function Rack3DPanel({
  isOpen,
  sizeU,
  equipment,
  annotations,
  measurements,
  connections,
  tourActive,
  tourIndex,
  onAnnotationEdit,
  onAnnotationDelete,
  onEquipmentClick,
}: Rack3DPanelProps) {
  return (
    <div
      className={cn(
        'h-full bg-background border-l transition-all duration-300 overflow-hidden',
        isOpen ? 'w-80' : 'w-0'
      )}
    >
      <ScrollArea className="h-full">
        <div className="p-4 space-y-4">
          {/* Measurements Header */}
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Ruler className="w-4 h-4" />
              Medições
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Ocupação</span>
                  <Badge variant={measurements.occupancyPercentage > 80 ? 'destructive' : 'secondary'}>
                    {Math.round(measurements.occupancyPercentage)}%
                  </Badge>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all"
                    style={{ width: `${measurements.occupancyPercentage}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {measurements.occupiedUs}U ocupados de {sizeU}U totais
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-muted/50 rounded">
                  <p className="text-muted-foreground">Livres</p>
                  <p className="font-medium">{measurements.availableUs}U</p>
                </div>
                <div className="p-2 bg-muted/50 rounded">
                  <p className="text-muted-foreground">Altura</p>
                  <p className="font-medium">{measurements.rackHeightM.toFixed(2)}m</p>
                </div>
              </div>

              {measurements.availableRanges.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Espaços disponíveis:</p>
                  <div className="flex flex-wrap gap-1">
                    {measurements.availableRanges.slice(0, 5).map((range, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {range}
                      </Badge>
                    ))}
                    {measurements.availableRanges.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{measurements.availableRanges.length - 5}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Server className="w-4 h-4" />
              Estatísticas
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                <Package className="w-3 h-3 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Equipamentos</p>
                  <p className="font-medium">{equipment.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                <Cable className="w-3 h-3 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Conexões</p>
                  <p className="font-medium">{connections}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded col-span-2">
                <Weight className="w-3 h-3 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Peso Estimado</p>
                  <p className="font-medium">~{measurements.estimatedWeightKg}kg</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tour Progress */}
          {tourActive && equipment.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-2">🎬 Tour em Progresso</h3>
              <div className="h-1 bg-secondary rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full bg-primary transition-all"
                  style={{ width: `${((tourIndex + 1) / equipment.length) * 100}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Equipamento {tourIndex + 1} de {equipment.length}
              </p>
              <Badge className="w-full justify-center">
                {equipment[tourIndex]?.name}
              </Badge>
            </div>
          )}

          {/* Annotations */}
          {annotations.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">
                📝 Anotações ({annotations.length})
              </h3>
              <div className="space-y-2">
                {annotations.map(annotation => (
                  <div 
                    key={annotation.id} 
                    className="flex items-start gap-2 p-2 border rounded hover:bg-accent/50 transition-colors"
                  >
                    <span className="text-base mt-0.5">{iconByType[annotation.annotation_type]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{annotation.title}</p>
                      <p className="text-xs text-muted-foreground">U{annotation.position_u} • {annotation.position_side}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => onAnnotationEdit(annotation)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => onAnnotationDelete(annotation.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Equipment List */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-3">
              📦 Equipamentos ({equipment.length})
            </h3>
            <div className="space-y-1">
              {equipment.slice(0, 10).map(eq => {
                const heightUs = eq.position_u_end - eq.position_u_start + 1;
                return (
                  <div 
                    key={eq.id}
                    className="flex items-center justify-between p-2 border rounded text-xs hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => onEquipmentClick?.(eq)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{eq.name}</p>
                      <p className="text-muted-foreground">U{eq.position_u_start}-U{eq.position_u_end}</p>
                    </div>
                    <Badge variant="outline">{heightUs}U</Badge>
                  </div>
                );
              })}
              {equipment.length > 10 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  +{equipment.length - 10} mais equipamentos
                </p>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
