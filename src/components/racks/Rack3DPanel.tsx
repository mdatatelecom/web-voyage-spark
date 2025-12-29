import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Edit, 
  Trash2, 
  Package, 
  Cable, 
  Ruler, 
  Weight, 
  Server, 
  BarChart3, 
  Zap,
  Thermometer,
  HardDrive
} from 'lucide-react';
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

// Get occupancy color based on percentage
const getOccupancyColor = (percentage: number) => {
  if (percentage < 50) return 'bg-[hsl(var(--status-ok))]';
  if (percentage < 80) return 'bg-[hsl(var(--status-warning))]';
  return 'bg-[hsl(var(--status-error))]';
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
  // Estimate power consumption (rough calculation)
  const estimatedPower = equipment.reduce((acc, eq) => {
    const powerByType: Record<string, number> = {
      server: 500,
      switch: 50,
      switch_poe: 150,
      router: 80,
      firewall: 100,
      storage: 300,
      nvr: 100,
      dvr: 80,
      ups: 20,
      pdu: 10,
      pdu_smart: 15,
    };
    return acc + (powerByType[eq.type] || 30);
  }, 0);

  // Estimate PoE load
  const poeEquipment = equipment.filter(eq => eq.type === 'switch_poe');
  const estimatedPoeLoad = poeEquipment.length * 120; // Rough estimate

  return (
    <div
      className={cn(
        'h-full bg-background/95 backdrop-blur-sm border-l transition-all duration-300 overflow-hidden',
        isOpen ? 'w-80' : 'w-0'
      )}
    >
      <ScrollArea className="h-full">
        <div className="p-4 space-y-4">
          
          {/* Occupancy Card */}
          <Card className="bg-card/50 border-muted">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Ocupação do Rack
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-3xl font-bold">{measurements.occupiedUs}</span>
                  <span className="text-lg text-muted-foreground">U</span>
                </div>
                <div className="text-right">
                  <Badge 
                    variant={measurements.occupancyPercentage > 80 ? 'destructive' : 'secondary'}
                    className="text-base px-2.5 py-0.5"
                  >
                    {Math.round(measurements.occupancyPercentage)}%
                  </Badge>
                </div>
              </div>
              
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn("h-full transition-all", getOccupancyColor(measurements.occupancyPercentage))}
                  style={{ width: `${measurements.occupancyPercentage}%` }}
                />
              </div>
              
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{measurements.availableUs}U disponíveis</span>
                <span>de {sizeU}U total</span>
              </div>

              {measurements.availableRanges.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-1.5">Faixas livres:</p>
                  <div className="flex flex-wrap gap-1">
                    {measurements.availableRanges.slice(0, 5).map((range, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs font-mono">
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
            </CardContent>
          </Card>

          {/* Energy Card */}
          <Card className="bg-card/50 border-muted">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                Energia
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Consumo estimado</span>
                <span className="font-semibold font-mono">{estimatedPower}W</span>
              </div>
              {estimatedPoeLoad > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Carga PoE</span>
                  <span className="font-semibold font-mono">{estimatedPoeLoad}W</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Carga total estimada</span>
                <span className="font-semibold font-mono">{estimatedPower + estimatedPoeLoad}W</span>
              </div>
            </CardContent>
          </Card>

          {/* Physical Stats Card */}
          <Card className="bg-card/50 border-muted">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Ruler className="w-4 h-4 text-blue-500" />
                Dimensões Físicas
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-muted/50 rounded flex flex-col">
                  <span className="text-muted-foreground">Altura</span>
                  <span className="font-semibold font-mono">{measurements.rackHeightM.toFixed(2)}m</span>
                </div>
                <div className="p-2 bg-muted/50 rounded flex flex-col">
                  <span className="text-muted-foreground">Largura</span>
                  <span className="font-semibold font-mono">19"</span>
                </div>
                <div className="p-2 bg-muted/50 rounded flex flex-col">
                  <span className="text-muted-foreground">Profundidade</span>
                  <span className="font-semibold font-mono">0.8m</span>
                </div>
                <div className="p-2 bg-muted/50 rounded flex flex-col">
                  <span className="text-muted-foreground">Carga total</span>
                  <span className="font-semibold font-mono">~{measurements.estimatedWeightKg}kg</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assets Stats Card */}
          <Card className="bg-card/50 border-muted">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Server className="w-4 h-4 text-purple-500" />
                Ativos Instalados
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                  <HardDrive className="w-3.5 h-3.5 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Equipamentos</span>
                    <span className="font-semibold">{equipment.length}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                  <Cable className="w-3.5 h-3.5 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Conexões</span>
                    <span className="font-semibold">{connections}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tour Progress */}
          {tourActive && equipment.length > 0 && (
            <Card className="bg-primary/10 border-primary/20">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎬</span>
                  <span className="text-sm font-semibold">Tour em Progresso</span>
                </div>
                <Progress 
                  value={((tourIndex + 1) / equipment.length) * 100}
                  className="h-1.5"
                />
                <div className="flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">
                    {tourIndex + 1} de {equipment.length}
                  </p>
                  <Badge variant="secondary" className="text-xs">
                    {equipment[tourIndex]?.name}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Annotations */}
          {annotations.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  📝 Anotações
                  <Badge variant="secondary" className="text-xs">{annotations.length}</Badge>
                </h3>
                <div className="space-y-2">
                  {annotations.map(annotation => (
                    <div 
                      key={annotation.id} 
                      className="flex items-start gap-2 p-2 border rounded-lg hover:bg-accent/50 transition-colors group"
                    >
                      <span className="text-base mt-0.5">{iconByType[annotation.annotation_type]}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{annotation.title}</p>
                        <p className="text-xs text-muted-foreground font-mono">U{annotation.position_u} • {annotation.position_side}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
            </>
          )}

          {/* Equipment List */}
          <Separator />
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              📦 Equipamentos
              <Badge variant="secondary" className="text-xs">{equipment.length}</Badge>
            </h3>
            <div className="space-y-1.5">
              {equipment.slice(0, 10).map(eq => {
                const heightUs = eq.position_u_end - eq.position_u_start + 1;
                return (
                  <div 
                    key={eq.id}
                    className="flex items-center justify-between p-2 border rounded-lg text-xs hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => onEquipmentClick?.(eq)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{eq.name}</p>
                      <p className="text-muted-foreground font-mono">U{eq.position_u_start}-U{eq.position_u_end}</p>
                    </div>
                    <Badge variant="outline" className="font-mono">{heightUs}U</Badge>
                  </div>
                );
              })}
              {equipment.length > 10 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  +{equipment.length - 10} equipamentos adicionais
                </p>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}