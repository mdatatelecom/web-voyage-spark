import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConnectionDiagram } from '@/components/connections/ConnectionDiagram';
import { LabelDialog } from '@/components/labels/LabelDialog';
import { Edit, Unplug, QrCode, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';

export default function ConnectionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newStatus, setNewStatus] = useState('');
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);

  const { data: connection, isLoading } = useQuery({
    queryKey: ['connection', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_connection_details')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const { error: connError } = await supabase
        .from('connections')
        .update({ status: 'inactive' })
        .eq('id', id);

      if (connError) throw connError;

      const { error: portsError } = await supabase
        .from('ports')
        .update({ status: 'available' })
        .in('id', [connection.port_a_id, connection.port_b_id]);

      if (portsError) throw portsError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connection', id] });
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      queryClient.invalidateQueries({ queryKey: ['ports'] });
      toast.success('Conexão desconectada. Portas liberadas.');
      navigate('/connections');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao desconectar: ${error.message}`);
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase
        .from('connections')
        .update({ status: status as any })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connection', id] });
      toast.success('Status atualizado com sucesso!');
      setNewStatus('');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    }
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; color: string }> = {
      active: { label: 'Ativo', color: 'bg-green-500' },
      inactive: { label: 'Inativo', color: 'bg-gray-500' },
      testing: { label: 'Testando', color: 'bg-yellow-500' },
      faulty: { label: 'Defeituoso', color: 'bg-red-500' },
      reserved: { label: 'Reservado', color: 'bg-blue-500' }
    };
    const { label, color } = config[status] || { label: status, color: 'bg-gray-500' };
    return <Badge className={color}>{label}</Badge>;
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="text-center py-12">Carregando...</div>
      </AppLayout>
    );
  }

  if (!connection) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Conexão não encontrada</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{connection.connection_code}</h1>
            <div className="flex items-center gap-2 mt-2">
              {getStatusBadge(connection.status)}
              <span className="text-sm text-muted-foreground">
                Instalado em {new Date(connection.installed_at).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={newStatus} onValueChange={(value) => {
              setNewStatus(value);
              updateStatusMutation.mutate(value);
            }}>
              <SelectTrigger className="w-[180px]">
                <Edit className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Alterar Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="testing">Testando</SelectItem>
                <SelectItem value="faulty">Defeituoso</SelectItem>
                <SelectItem value="reserved">Reservado</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => setLabelDialogOpen(true)}>
              <QrCode className="w-4 h-4 mr-2" />
              Gerar Etiqueta
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Unplug className="w-4 h-4 mr-2" />
                  Desconectar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar Desconexão</AlertDialogTitle>
                  <AlertDialogDescription>
                    Isso irá desconectar a conexão {connection.connection_code} e liberar as portas.
                    Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => disconnectMutation.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Desconectar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <ConnectionDiagram connection={connection} />

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">📋 Informações Adicionais</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Código da Conexão</p>
                <p className="font-medium">{connection.connection_code}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tipo de Cabo</p>
                <p className="font-medium">{connection.cable_type}</p>
              </div>
              {connection.cable_length_meters && (
                <div>
                  <p className="text-sm text-muted-foreground">Comprimento</p>
                  <p className="font-medium">{connection.cable_length_meters}m</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Data de Instalação</p>
                <p className="font-medium">
                  {new Date(connection.installed_at).toLocaleString('pt-BR')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status Atual</p>
                {getStatusBadge(connection.status)}
              </div>
              {connection.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Observações</p>
                  <p className="font-medium">{connection.notes}</p>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">📜 Histórico de Mudanças</h2>
          <p className="text-sm text-muted-foreground">
            {new Date(connection.installed_at).toLocaleString('pt-BR')} - Conexão criada
          </p>
        </Card>

        <LabelDialog
          open={labelDialogOpen}
          onOpenChange={setLabelDialogOpen}
          connection={connection}
        />
      </div>
    </AppLayout>
  );
}
