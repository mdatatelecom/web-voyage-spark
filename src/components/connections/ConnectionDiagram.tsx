import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cable, Zap } from 'lucide-react';
import { POE_POWER_CONSUMPTION } from '@/constants/equipmentTypes';

interface ConnectionDiagramProps {
  connection: any;
}

// Helper to determine PoE details for a connection
const getPoePowerInfo = (connection: any) => {
  const poePortTypes = ['rj45_poe', 'rj45_poe_plus', 'rj45_poe_plus_plus'];
  
  // Check if side A is a PoE switch providing power to side B
  const aIsPoeSwitch = connection.equipment_a_type === 'switch_poe';
  const bIsPoeSwitch = connection.equipment_b_type === 'switch_poe';
  
  // Device that receives power
  const bConsumes = POE_POWER_CONSUMPTION[connection.equipment_b_type] || 0;
  const aConsumes = POE_POWER_CONSUMPTION[connection.equipment_a_type] || 0;

  if (aIsPoeSwitch && bConsumes > 0) {
    return {
      provider: 'A',
      consumer: 'B',
      watts: bConsumes,
      poeClass: getPoeClass(bConsumes)
    };
  }
  
  if (bIsPoeSwitch && aConsumes > 0) {
    return {
      provider: 'B',
      consumer: 'A',
      watts: aConsumes,
      poeClass: getPoeClass(aConsumes)
    };
  }
  
  return null;
};

const getPoeClass = (watts: number): string => {
  if (watts <= 15.4) return '802.3af';
  if (watts <= 30) return '802.3at';
  if (watts <= 60) return '802.3bt T3';
  if (watts <= 100) return '802.3bt T4';
  return 'High Power';
};

export const ConnectionDiagram = ({ connection }: ConnectionDiagramProps) => {
  const poeInfo = getPoePowerInfo(connection);
  
  return (
    <Card className="p-6">
      <div className="grid md:grid-cols-3 gap-4 items-center">
        {/* Point A */}
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <h3 className="font-semibold text-sm text-primary mb-3">📍 PONTO A (Origem)</h3>
          <div className="space-y-1 text-sm">
            <p className="font-medium">{connection.equipment_a_name}</p>
            <p className="text-muted-foreground">Porta: {connection.port_a_name}</p>
            <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
              <p>📦 {connection.rack_a_name}</p>
            </div>
            
            {/* PoE Indicator for Point A */}
            {poeInfo && poeInfo.provider === 'A' && (
              <div className="mt-3 flex items-center gap-2 text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30 p-2 rounded">
                <Zap className="w-4 h-4" />
                <span className="text-xs font-medium">
                  Fornece PoE: {poeInfo.watts}W
                </span>
              </div>
            )}
            {poeInfo && poeInfo.consumer === 'A' && (
              <div className="mt-3 flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-950/30 p-2 rounded">
                <Zap className="w-4 h-4" />
                <span className="text-xs font-medium">
                  Recebe PoE: {poeInfo.watts}W ({poeInfo.poeClass})
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Cable Section */}
        <div className="flex flex-col items-center justify-center space-y-3">
          <Cable className="w-8 h-8 text-primary" />
          <div className="text-center space-y-1">
            <p className="font-medium text-sm">{connection.cable_type}</p>
            {connection.cable_length_meters && (
              <p className="text-xs text-muted-foreground">
                {connection.cable_length_meters}m
              </p>
            )}
            {connection.cable_color && (
              <div className="flex items-center justify-center gap-2">
                <div
                  className="w-6 h-6 rounded border"
                  style={{ backgroundColor: connection.cable_color }}
                />
                <span className="text-xs text-muted-foreground">
                  {connection.cable_color}
                </span>
              </div>
            )}
            
            {/* PoE Power Flow Badge */}
            {poeInfo && (
              <Badge variant="outline" className="mt-2 text-yellow-600 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30">
                <Zap className="w-3 h-3 mr-1" />
                {poeInfo.watts}W ({poeInfo.poeClass})
              </Badge>
            )}
          </div>
        </div>

        {/* Point B */}
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <h3 className="font-semibold text-sm text-primary mb-3">📍 PONTO B (Destino)</h3>
          <div className="space-y-1 text-sm">
            <p className="font-medium">{connection.equipment_b_name}</p>
            <p className="text-muted-foreground">Porta: {connection.port_b_name}</p>
            <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
              <p>📦 {connection.rack_b_name}</p>
            </div>
            
            {/* PoE Indicator for Point B */}
            {poeInfo && poeInfo.provider === 'B' && (
              <div className="mt-3 flex items-center gap-2 text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30 p-2 rounded">
                <Zap className="w-4 h-4" />
                <span className="text-xs font-medium">
                  Fornece PoE: {poeInfo.watts}W
                </span>
              </div>
            )}
            {poeInfo && poeInfo.consumer === 'B' && (
              <div className="mt-3 flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-950/30 p-2 rounded">
                <Zap className="w-4 h-4" />
                <span className="text-xs font-medium">
                  Recebe PoE: {poeInfo.watts}W ({poeInfo.poeClass})
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
