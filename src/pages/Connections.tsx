import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Plus, Cable, QrCode } from 'lucide-react';
import { ConnectionDialog } from '@/components/connections/ConnectionDialog';
import { useConnections } from '@/hooks/useConnections';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { ExportButton } from '@/components/export/ExportButton';
import { LabelDialog } from '@/components/labels/LabelDialog';

export default function Connections() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<any>(null);
  const { connections, isLoading } = useConnections();
  const navigate = useNavigate();

  const handleGenerateLabel = (conn: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedConnection(conn);
    setLabelDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-500',
      inactive: 'bg-gray-500',
      testing: 'bg-yellow-500',
      faulty: 'bg-red-500',
      reserved: 'bg-blue-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Cable className="w-8 h-8" />
              Conexões
            </h1>
            <p className="text-muted-foreground">
              Gerencie todas as conexões de rede
            </p>
          </div>
          <div className="flex gap-2">
            {connections && connections.length > 0 && (
              <ExportButton
                data={connections.map(conn => ({
                  'Código': conn.connection_code,
                  'Status': conn.status,
                  'Equipamento A': conn.equipment_a_name,
                  'Porta A': conn.port_a_name,
                  'Rack A': conn.rack_a_name,
                  'Equipamento B': conn.equipment_b_name,
                  'Porta B': conn.port_b_name,
                  'Rack B': conn.rack_b_name,
                  'Tipo de Cabo': conn.cable_type,
                  'Comprimento (m)': conn.cable_length_meters || '-',
                  'Cor': conn.cable_color || '-',
                  'Data Instalação': conn.installed_at 
                    ? new Date(conn.installed_at).toLocaleDateString('pt-BR')
                    : '-',
                }))}
                filename="conexoes"
                sheetName="Conexões"
              />
            )}
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Conexão
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Carregando...</div>
        ) : connections && connections.length > 0 ? (
          <div className="grid gap-4">
            {connections.map((conn) => (
              <div
                key={conn.id}
                onClick={() => navigate(`/connections/${conn.id}`)}
                className="p-6 border rounded-lg hover:shadow-lg transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      {conn.connection_code}
                    </h3>
                    <Badge className={getStatusColor(conn.status || 'active')}>
                      {conn.status}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => handleGenerateLabel(conn, e)}
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Gerar Etiqueta
                  </Button>
                </div>

                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium mb-1">📍 Ponto A</p>
                    <p className="text-muted-foreground">
                      {conn.equipment_a_name} / {conn.port_a_name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {conn.rack_a_name}
                    </p>
                  </div>

                  <div className="flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <div>
                        <Cable className="w-6 h-6 mx-auto mb-1 text-primary" />
                        <p className="text-xs text-muted-foreground">
                          {conn.cable_type}
                          {conn.cable_length_meters && ` | ${conn.cable_length_meters}m`}
                        </p>
                        {conn.cable_color && (
                          <div
                            className="w-8 h-2 mx-auto mt-1 rounded"
                            style={{ backgroundColor: conn.cable_color }}
                          />
                        )}
                      </div>
                      {conn.vlan_id && (
                        <Badge variant="outline" className="text-xs">
                          🌐 VLAN {conn.vlan_id}
                          {conn.vlan_name && `: ${conn.vlan_name}`}
                          {conn.vlan_tagging === 'tagged' && ' (Tagged)'}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium mb-1">📍 Ponto B</p>
                    <p className="text-muted-foreground">
                      {conn.equipment_b_name} / {conn.port_b_name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {conn.rack_b_name}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border rounded-lg">
            <Cable className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              Nenhuma conexão cadastrada
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeira Conexão
            </Button>
          </div>
        )}
      </div>

      <ConnectionDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      {selectedConnection && (
        <LabelDialog
          open={labelDialogOpen}
          onOpenChange={setLabelDialogOpen}
          connection={selectedConnection}
        />
      )}
    </AppLayout>
  );
}
