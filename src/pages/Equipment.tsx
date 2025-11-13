import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Plus, Server } from 'lucide-react';
import { EquipmentDialog } from '@/components/equipment/EquipmentDialog';
import { useEquipment } from '@/hooks/useEquipment';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { ExportButton } from '@/components/export/ExportButton';

export default function Equipment() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { equipment, isLoading } = useEquipment();
  const navigate = useNavigate();

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      switch: 'bg-blue-500',
      router: 'bg-green-500',
      server: 'bg-orange-500',
      patch_panel: 'bg-gray-500',
      firewall: 'bg-red-500',
      storage: 'bg-purple-500'
    };
    return colors[type] || 'bg-gray-500';
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Server className="w-8 h-8" />
              Equipamentos
            </h1>
            <p className="text-muted-foreground">
              Gerencie todos os equipamentos de rede
            </p>
          </div>
          <div className="flex gap-2">
            {equipment && equipment.length > 0 && (
              <ExportButton
                data={equipment.map(eq => ({
                  'Nome': eq.name,
                  'Tipo': eq.type,
                  'Fabricante': eq.manufacturer || '-',
                  'Modelo': eq.model || '-',
                  'Hostname': eq.hostname || '-',
                  'IP': eq.ip_address || '-',
                  'Serial': eq.serial_number || '-',
                  'Rack': eq.rack?.name || '-',
                  'Posição': eq.position_u_start && eq.position_u_end 
                    ? `U${eq.position_u_start}-${eq.position_u_end}` 
                    : '-',
                  'Total Portas': eq.ports?.[0]?.count || 0,
                }))}
                filename="equipamentos"
                sheetName="Equipamentos"
              />
            )}
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Equipamento
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Carregando...</div>
        ) : equipment && equipment.length > 0 ? (
          <div className="grid gap-4">
            {equipment.map((eq) => (
              <div
                key={eq.id}
                onClick={() => navigate(`/equipment/${eq.id}`)}
                className="p-6 border rounded-lg hover:shadow-lg transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{eq.name}</h3>
                      <Badge className={getTypeColor(eq.type)}>
                        {eq.type}
                      </Badge>
                      {eq.ports && (
                        <Badge variant="outline">
                          {eq.ports[0]?.count || 0} portas
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {eq.manufacturer && <p>📦 {eq.manufacturer} {eq.model}</p>}
                      {eq.hostname && <p>🌐 {eq.hostname}</p>}
                      {eq.ip_address && <p>🔗 {eq.ip_address}</p>}
                      {eq.rack && (
                        <p>📍 {eq.rack.name} | U{eq.position_u_start}-{eq.position_u_end}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border rounded-lg">
            <Server className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              Nenhum equipamento cadastrado
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Primeiro Equipamento
            </Button>
          </div>
        )}
      </div>

      <EquipmentDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </AppLayout>
  );
}
