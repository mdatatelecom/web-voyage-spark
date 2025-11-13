import { Card } from '@/components/ui/card';
import { Cable } from 'lucide-react';

interface ConnectionDiagramProps {
  connection: any;
}

export const ConnectionDiagram = ({ connection }: ConnectionDiagramProps) => {
  return (
    <Card className="p-6">
      <div className="grid md:grid-cols-3 gap-4 items-center">
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <h3 className="font-semibold text-sm text-primary mb-3">📍 PONTO A (Origem)</h3>
          <div className="space-y-1 text-sm">
            <p className="font-medium">{connection.equipment_a_name}</p>
            <p className="text-muted-foreground">Porta: {connection.port_a_name}</p>
            <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
              <p>📦 {connection.rack_a_name}</p>
            </div>
          </div>
        </div>

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
          </div>
        </div>

        <div className="p-4 bg-muted rounded-lg space-y-2">
          <h3 className="font-semibold text-sm text-primary mb-3">📍 PONTO B (Destino)</h3>
          <div className="space-y-1 text-sm">
            <p className="font-medium">{connection.equipment_b_name}</p>
            <p className="text-muted-foreground">Porta: {connection.port_b_name}</p>
            <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
              <p>📦 {connection.rack_b_name}</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
