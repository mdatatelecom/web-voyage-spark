import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MobileViewerLayout } from '@/components/layout/MobileViewerLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Cable, Ruler, Palette, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const getCableTypeLabel = (type: string) => {
  const types: Record<string, string> = {
    utp_cat5e: 'UTP Cat5e',
    utp_cat6: 'UTP Cat6',
    utp_cat6a: 'UTP Cat6a',
    fiber_om3: 'Fibra OM3',
    fiber_om4: 'Fibra OM4',
    fiber_os2: 'Fibra OS2',
    dac: 'DAC',
    other: 'Outro'
  };
  return types[type] || type;
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    active: 'bg-green-500',
    inactive: 'bg-gray-500',
    reserved: 'bg-yellow-500',
    testing: 'bg-blue-500',
    faulty: 'bg-red-500'
  };
  return colors[status] || 'bg-gray-500';
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    active: 'Ativo',
    inactive: 'Inativo',
    reserved: 'Reservado',
    testing: 'Em Teste',
    faulty: 'Defeituoso'
  };
  return labels[status] || status;
};

export default function ConnectionDetailsViewer() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: connection, isLoading, error } = useQuery({
    queryKey: ['connection-details-viewer', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_connection_details')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return (
      <MobileViewerLayout>
        <div className="p-4 space-y-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </MobileViewerLayout>
    );
  }

  if (error || !connection) {
    return (
      <MobileViewerLayout>
        <div className="p-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/my-connections')}
            className="mb-6 -ml-2"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Voltar
          </Button>
          
          <Card className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2 text-destructive">
              Conexão não encontrada
            </h2>
            <p className="text-muted-foreground">
              Você não tem permissão para ver esta conexão ou ela não existe.
            </p>
          </Card>
        </div>
      </MobileViewerLayout>
    );
  }

  return (
    <MobileViewerLayout>
      <div className="p-4 space-y-4 pb-24">
        {/* Botão Voltar */}
        <Button
          variant="ghost"
          onClick={() => navigate('/my-connections')}
          className="mb-2 -ml-2"
          size="lg"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Voltar
        </Button>

        {/* Card: Código + Status */}
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Código da Conexão</p>
              <h1 className="text-2xl font-bold">{connection.connection_code}</h1>
            </div>
            <Badge className={`${getStatusColor(connection.status)} text-white`}>
              {getStatusLabel(connection.status)}
            </Badge>
          </div>
        </Card>

        {/* Card: Diagrama da Conexão */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Cable className="h-5 w-5" />
            Diagrama da Conexão
          </h2>
          
          {/* Ponto A */}
          <div className="bg-muted/50 rounded-lg p-4 mb-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2">📍 PONTO A (ORIGEM)</p>
            <div className="space-y-1">
              <p className="font-medium text-base">{connection.equipment_a_name}</p>
              <p className="text-sm text-muted-foreground">Porta: {connection.port_a_name}</p>
              <p className="text-sm text-muted-foreground">Rack: {connection.rack_a_name}</p>
            </div>
          </div>

          {/* Seta */}
          <div className="flex justify-center my-2">
            <div className="text-2xl text-muted-foreground">↓</div>
          </div>

          {/* Ponto B */}
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">📍 PONTO B (DESTINO)</p>
            <div className="space-y-1">
              <p className="font-medium text-base">{connection.equipment_b_name}</p>
              <p className="text-sm text-muted-foreground">Porta: {connection.port_b_name}</p>
              <p className="text-sm text-muted-foreground">Rack: {connection.rack_b_name}</p>
            </div>
          </div>
        </Card>

        {/* Card: Informações do Cabo */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Informações do Cabo</h2>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Cable className="h-5 w-5 mt-0.5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Tipo</p>
                <p className="font-medium">{getCableTypeLabel(connection.cable_type)}</p>
              </div>
            </div>

            {connection.cable_length_meters && (
              <div className="flex items-start gap-3">
                <Ruler className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Comprimento</p>
                  <p className="font-medium">{connection.cable_length_meters}m</p>
                </div>
              </div>
            )}

            {connection.cable_color && (
              <div className="flex items-start gap-3">
                <Palette className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Cor</p>
                  <p className="font-medium">{connection.cable_color}</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Card: Informações Adicionais */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Informações Adicionais</h2>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 mt-0.5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Data de Instalação</p>
                <p className="font-medium">
                  {format(new Date(connection.installed_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>

            {connection.notes && (
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Observações</p>
                  <p className="font-medium whitespace-pre-wrap">{connection.notes}</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </MobileViewerLayout>
  );
}
