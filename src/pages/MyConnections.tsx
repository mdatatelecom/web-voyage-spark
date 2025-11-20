import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Loader2, QrCode, ArrowRight, Cable } from 'lucide-react';

export default function MyConnections() {
  const navigate = useNavigate();
  const { data: connections, isLoading } = useQuery({
    queryKey: ['my-scanned-connections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_connection_details')
        .select('*')
        .order('installed_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const getCableTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      fiber: 'Fibra Óptica',
      copper: 'Cobre',
      coaxial: 'Coaxial',
    };
    return labels[type] || type;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-500 text-white',
      inactive: 'bg-gray-500 text-white',
      faulty: 'bg-red-500 text-white',
      testing: 'bg-blue-500 text-white',
      reserved: 'bg-yellow-500 text-white',
    };
    return colors[status] || 'bg-gray-500 text-white';
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Minhas Conexões</h1>
          <p className="text-sm text-muted-foreground">
            Conexões que você escaneou
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : connections && connections.length > 0 ? (
          <div className="space-y-3">
            {connections.map((connection) => (
              <Card key={connection.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Connection Code */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Cable className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold text-lg">{connection.connection_code}</span>
                      </div>
                      <Badge className={getStatusColor(connection.status || 'active')}>
                        {connection.status === 'active' ? 'Ativo' : 
                         connection.status === 'inactive' ? 'Inativo' : 
                         connection.status === 'faulty' ? 'Com Falha' :
                         connection.status === 'testing' ? 'Testando' :
                         connection.status === 'reserved' ? 'Reservado' :
                         connection.status}
                      </Badge>
                    </div>

                    {/* Equipment Connection */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{connection.equipment_a_name}</span>
                        <span className="text-muted-foreground">({connection.port_a_name})</span>
                      </div>
                      <div className="flex items-center justify-center">
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{connection.equipment_b_name}</span>
                        <span className="text-muted-foreground">({connection.port_b_name})</span>
                      </div>
                    </div>

                    {/* Cable Info */}
                    <div className="flex items-center justify-between text-sm pt-2 border-t">
                      <span className="text-muted-foreground">
                        {getCableTypeLabel(connection.cable_type || '')}
                      </span>
                      {connection.cable_length_meters && (
                        <span className="text-muted-foreground">
                          {connection.cable_length_meters}m
                        </span>
                      )}
                    </div>

                    {/* View Details Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => navigate(`/my-connections/${connection.id}`)}
                    >
                      Ver Detalhes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
              <QrCode className="h-16 w-16 text-muted-foreground" />
              <div className="text-center space-y-2">
                <p className="font-medium">Nenhuma conexão escaneada ainda</p>
                <p className="text-sm text-muted-foreground">
                  Escaneie um QR Code para começar
                </p>
              </div>
              <Button onClick={() => navigate('/scan')}>
                <QrCode className="h-4 w-4 mr-2" />
                Escanear QR Code
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}