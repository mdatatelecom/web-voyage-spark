import { useState, useEffect } from 'react';
import { X, Link2, Link2Off, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FloorPlan } from '@/hooks/useFloorPlans';
import { useEquipmentPositions } from '@/hooks/useEquipmentPositions';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface FloorPlanComparisonProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  floorPlans: FloorPlan[];
  initialLeftId?: string;
  initialRightId?: string;
}

export function FloorPlanComparison({
  open,
  onOpenChange,
  floorPlans,
  initialLeftId,
  initialRightId,
}: FloorPlanComparisonProps) {
  const [leftPlanId, setLeftPlanId] = useState<string | null>(null);
  const [rightPlanId, setRightPlanId] = useState<string | null>(null);
  const [syncZoom, setSyncZoom] = useState(true);

  // Set initial plans when dialog opens
  useEffect(() => {
    if (open && floorPlans.length >= 2) {
      setLeftPlanId(initialLeftId || floorPlans[0]?.id || null);
      setRightPlanId(initialRightId || floorPlans[1]?.id || null);
    }
  }, [open, floorPlans, initialLeftId, initialRightId]);

  const leftPlan = floorPlans.find(p => p.id === leftPlanId);
  const rightPlan = floorPlans.find(p => p.id === rightPlanId);

  const { positions: leftPositions } = useEquipmentPositions(leftPlanId || undefined);
  const { positions: rightPositions } = useEquipmentPositions(rightPlanId || undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2">
            <Maximize2 className="h-5 w-5" />
            Comparação de Plantas
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={syncZoom ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSyncZoom(!syncZoom)}
                >
                  {syncZoom ? (
                    <Link2 className="h-4 w-4" />
                  ) : (
                    <Link2Off className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {syncZoom ? 'Zoom sincronizado' : 'Zoom independente'}
              </TooltipContent>
            </Tooltip>
          </div>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-2 gap-4 overflow-hidden">
          {/* Left Panel */}
          <div className="flex flex-col border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-3 bg-muted/50 border-b">
              <Select value={leftPlanId || ''} onValueChange={setLeftPlanId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecione uma versão" />
                </SelectTrigger>
                <SelectContent>
                  {floorPlans.map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {leftPositions && (
                <Badge variant="secondary">
                  {leftPositions.length} equipamentos
                </Badge>
              )}
            </div>
            <div className="flex-1 relative bg-muted/20">
              {leftPlan ? (
                <img
                  src={leftPlan.file_url}
                  alt={leftPlan.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Selecione uma versão
                </div>
              )}
            </div>
          </div>

          {/* Right Panel */}
          <div className="flex flex-col border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-3 bg-muted/50 border-b">
              <Select value={rightPlanId || ''} onValueChange={setRightPlanId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecione uma versão" />
                </SelectTrigger>
                <SelectContent>
                  {floorPlans.map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {rightPositions && (
                <Badge variant="secondary">
                  {rightPositions.length} equipamentos
                </Badge>
              )}
            </div>
            <div className="flex-1 relative bg-muted/20">
              {rightPlan ? (
                <img
                  src={rightPlan.file_url}
                  alt={rightPlan.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Selecione uma versão
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Comparison Summary */}
        {leftPositions && rightPositions && (
          <div className="flex items-center justify-center gap-6 p-3 bg-muted/30 rounded-lg">
            <div className="text-center">
              <p className="text-2xl font-bold">{leftPositions.length}</p>
              <p className="text-xs text-muted-foreground">Equipamentos (Esq.)</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {Math.abs(rightPositions.length - leftPositions.length)}
              </p>
              <p className="text-xs text-muted-foreground">Diferença</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{rightPositions.length}</p>
              <p className="text-xs text-muted-foreground">Equipamentos (Dir.)</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
