import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, AlertTriangle, CheckCircle, Activity } from 'lucide-react';

interface PoeBudgetIndicatorProps {
  budgetWatts: number;
  usedWatts?: number;
  activePorts?: number;
  totalPorts?: number;
  powerPerPort?: Record<string, number>;
}

interface PowerClass {
  name: string;
  maxWatts: number;
  count: number;
  totalWatts: number;
}

export const PoeBudgetIndicator = ({
  budgetWatts,
  usedWatts = 0,
  activePorts = 0,
  totalPorts = 0,
  powerPerPort = {}
}: PoeBudgetIndicatorProps) => {
  // Calculate usage percentage
  const usagePercentage = budgetWatts > 0 ? (usedWatts / budgetWatts) * 100 : 0;
  const availableWatts = budgetWatts - usedWatts;

  // Determine status color based on usage
  const getStatusColor = () => {
    if (usagePercentage >= 90) return 'text-destructive';
    if (usagePercentage >= 70) return 'text-warning';
    return 'text-success';
  };

  const getProgressColor = () => {
    if (usagePercentage >= 90) return 'bg-destructive';
    if (usagePercentage >= 70) return 'bg-warning';
    return 'bg-success';
  };

  const getStatusIcon = () => {
    if (usagePercentage >= 90) return <AlertTriangle className="h-4 w-4 text-destructive" />;
    if (usagePercentage >= 70) return <Activity className="h-4 w-4 text-warning" />;
    return <CheckCircle className="h-4 w-4 text-success" />;
  };

  // Calculate power classes from powerPerPort
  const powerClasses: PowerClass[] = [];
  const portPowers = Object.values(powerPerPort);
  
  if (portPowers.length > 0) {
    // Group by PoE class
    const poeClassic = portPowers.filter(p => p > 0 && p <= 15.4);
    const poePlus = portPowers.filter(p => p > 15.4 && p <= 30);
    const poePlusPlus = portPowers.filter(p => p > 30);
    const lowPower = portPowers.filter(p => p > 0 && p <= 5);

    if (poeClassic.length > 0) {
      powerClasses.push({
        name: 'PoE (≤15.4W)',
        maxWatts: 15.4,
        count: poeClassic.length,
        totalWatts: poeClassic.reduce((a, b) => a + b, 0)
      });
    }
    if (poePlus.length > 0) {
      powerClasses.push({
        name: 'PoE+ (≤30W)',
        maxWatts: 30,
        count: poePlus.length,
        totalWatts: poePlus.reduce((a, b) => a + b, 0)
      });
    }
    if (poePlusPlus.length > 0) {
      powerClasses.push({
        name: 'PoE++ (≤100W)',
        maxWatts: 100,
        count: poePlusPlus.length,
        totalWatts: poePlusPlus.reduce((a, b) => a + b, 0)
      });
    }
    if (lowPower.length > 0 && poeClassic.length === 0) {
      powerClasses.push({
        name: 'Baixo consumo (<5W)',
        maxWatts: 5,
        count: lowPower.length,
        totalWatts: lowPower.reduce((a, b) => a + b, 0)
      });
    }
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Zap className="h-4 w-4 text-warning" />
          PoE Power Budget
          {getStatusIcon()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="relative">
            <Progress 
              value={Math.min(usagePercentage, 100)} 
              className="h-3"
            />
            <div 
              className={`absolute inset-0 h-3 rounded-full ${getProgressColor()}`}
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0W</span>
            <span className={`font-medium ${getStatusColor()}`}>
              {usagePercentage.toFixed(1)}%
            </span>
            <span>{budgetWatts}W</span>
          </div>
        </div>

        {/* Usage stats */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs">Usado</span>
            <span className={`font-semibold ${getStatusColor()}`}>
              {usedWatts.toFixed(1)}W
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs">Disponível</span>
            <span className="font-semibold text-success">
              {availableWatts.toFixed(1)}W
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs">Portas ativas</span>
            <span className="font-medium">
              {activePorts}/{totalPorts}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs">Budget total</span>
            <span className="font-medium">{budgetWatts}W</span>
          </div>
        </div>

        {/* Power classes breakdown */}
        {powerClasses.length > 0 && (
          <div className="pt-2 border-t border-border/50">
            <span className="text-xs text-muted-foreground">Consumo por classe:</span>
            <div className="mt-1 space-y-1">
              {powerClasses.map((pc, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    • {pc.name}: {pc.count} {pc.count === 1 ? 'porta' : 'portas'}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {pc.totalWatts.toFixed(1)}W
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warning message */}
        {usagePercentage >= 90 && (
          <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 text-destructive text-xs">
            <AlertTriangle className="h-3 w-3" />
            <span>Budget PoE próximo do limite! Considere redistribuir dispositivos.</span>
          </div>
        )}
        {usagePercentage >= 70 && usagePercentage < 90 && (
          <div className="flex items-center gap-2 p-2 rounded-md bg-warning/10 text-warning text-xs">
            <Activity className="h-3 w-3" />
            <span>Budget PoE em uso elevado. Monitore novos dispositivos.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
