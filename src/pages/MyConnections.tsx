import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';

export default function MyConnections() {
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
      active: 'bg-green-500',
      inactive: 'bg-gray-500',
      faulty: 'bg-red-500',
      testing: 'bg-blue-500',
      reserved: 'bg-yellow-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="text-center py-12">Carregando conexões...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Minhas Conexões Escaneadas</h1>
          <p className="text-muted-foreground">
            Visualize todas as conexões que você escaneou via QR Code
          </p>
        </div>

        <Card className="p-6">
          {connections && connections.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Equipamento A</TableHead>
                  <TableHead>Porta A</TableHead>
                  <TableHead>Equipamento B</TableHead>
                  <TableHead>Porta B</TableHead>
                  <TableHead>Tipo de Cabo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {connections.map((conn) => (
                  <TableRow key={conn.id}>
                    <TableCell className="font-medium">
                      {conn.connection_code}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{conn.equipment_a_name}</div>
                        <div className="text-sm text-muted-foreground">
                          Rack: {conn.rack_a_name}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{conn.port_a_name}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{conn.equipment_b_name}</div>
                        <div className="text-sm text-muted-foreground">
                          Rack: {conn.rack_b_name}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{conn.port_b_name}</TableCell>
                    <TableCell>{getCableTypeLabel(conn.cable_type)}</TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(conn.status)} text-white`}>
                        {conn.status === 'active' && 'Ativo'}
                        {conn.status === 'inactive' && 'Inativo'}
                        {conn.status === 'faulty' && 'Com Falha'}
                        {conn.status === 'testing' && 'Testando'}
                        {conn.status === 'reserved' && 'Reservado'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link to={`/connections/${conn.id}`}>
                        <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg mb-2">Nenhuma conexão escaneada ainda</p>
              <p className="text-sm">
                Use o scanner de QR Code para visualizar informações de conexões
              </p>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}