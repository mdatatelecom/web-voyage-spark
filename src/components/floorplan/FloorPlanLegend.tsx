import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const EQUIPMENT_LEGEND = [
  { type: 'ip_camera', label: 'Câmera IP', color: '#22c55e', emoji: '📹' },
  { type: 'nvr', label: 'NVR', color: '#3b82f6', emoji: '🖥️' },
  { type: 'switch', label: 'Switch', color: '#8b5cf6', emoji: '🔀' },
  { type: 'access_point', label: 'Access Point', color: '#f59e0b', emoji: '📡' },
  { type: 'router', label: 'Roteador', color: '#06b6d4', emoji: '🌐' },
  { type: 'firewall', label: 'Firewall', color: '#ef4444', emoji: '🛡️' },
  { type: 'server', label: 'Servidor', color: '#64748b', emoji: '🖧' },
  { type: 'pdu', label: 'PDU', color: '#f97316', emoji: '⚡' },
];

const STATUS_LEGEND = [
  { status: 'active', label: 'Ativo', color: '#22c55e' },
  { status: 'offline', label: 'Offline', color: '#ef4444' },
  { status: 'warning', label: 'Atenção', color: '#eab308' },
  { status: 'maintenance', label: 'Manutenção', color: '#3b82f6' },
];

export function FloorPlanLegend() {
  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Legenda</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Equipment Types */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Equipamentos</p>
          <div className="grid grid-cols-2 gap-1">
            {EQUIPMENT_LEGEND.map(item => (
              <div 
                key={item.type} 
                className="flex items-center gap-1.5 text-xs"
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Status</p>
          <div className="flex flex-wrap gap-1">
            {STATUS_LEGEND.map(item => (
              <Badge 
                key={item.status}
                variant="outline" 
                className="text-xs gap-1"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                {item.label}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
