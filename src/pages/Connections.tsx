import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Network, Tag, Loader2, MoreHorizontal, Eye, Unplug, Trash2 } from 'lucide-react';
import { ConnectionDialog } from '@/components/connections/ConnectionDialog';
import { LabelDialog } from '@/components/labels/LabelDialog';
import { useConnections } from '@/hooks/useConnections';
import { ExportButton } from '@/components/export/ExportButton';

export default function Connections() {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<any>(null);
  const { connections, isLoading, disconnectConnection, deleteConnection, isDisconnecting, isDeleting } = useConnections();

  const handleGenerateLabel = (connection: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedConnection(connection);
    setLabelDialogOpen(true);
  };

  const handleDisconnect = (connection: any, e: React.MouseEvent) => {
    e.stopPropagation();
    disconnectConnection(connection.id);
  };

  const handleDelete = (connection: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedConnection(connection);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedConnection) {
      deleteConnection(selectedConnection.id);
      setDeleteDialogOpen(false);
      setSelectedConnection(null);
    }
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
              <Network className="w-8 h-8" />
              Conexões
            </h1>
            <p className="text-muted-foreground">Gerencie todas as conexões de rede</p>
          </div>
          <div className="flex gap-2">
            {connections && connections.length > 0 && (
              <ExportButton
                data={connections.map(conn => ({
                  'Código': conn.connection_code,
                  'Status': conn.status,
                  'Equipamento A': conn.equipment_a_name,
                  'Porta A': conn.port_a_name,
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
          <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>
        ) : connections && connections.length > 0 ? (
          <div className="grid gap-4">
            {connections.map((connection: any) => (
              <Card key={connection.id} className="p-6 hover:shadow-lg transition-shadow cursor-pointer relative group" onClick={() => navigate(`/connections/${connection.id}`)}>
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/connections/${connection.id}`)}><Eye className="w-4 h-4 mr-2" />Ver Detalhes</DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleGenerateLabel(connection, e)}><Tag className="w-4 h-4 mr-2" />Gerar Etiqueta</DropdownMenuItem>
                      {connection.status === 'active' && (
                        <DropdownMenuItem onClick={(e) => handleDisconnect(connection, e)} disabled={isDisconnecting}><Unplug className="w-4 h-4 mr-2" />{isDisconnecting ? 'Desconectando...' : 'Desconectar'}</DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={(e) => handleDelete(connection, e)} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" />Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{connection.connection_code}</h3>
                    <Badge className={getStatusColor(connection.status || 'active')}>{connection.status}</Badge>
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium mb-1">📍 Ponto A</p>
                    <p className="text-muted-foreground">{connection.equipment_a_name} / {connection.port_a_name}</p>
                  </div>
                  <div className="flex items-center justify-center">
                    <Network className="w-6 h-6 text-primary" />
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium mb-1">📍 Ponto B</p>
                    <p className="text-muted-foreground">{connection.equipment_b_name} / {connection.port_b_name}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <Network className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">Nenhuma conexão cadastrada</p>
            <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />Criar Primeira Conexão</Button>
          </Card>
        )}
      </div>

      <ConnectionDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <LabelDialog open={labelDialogOpen} onOpenChange={setLabelDialogOpen} connection={selectedConnection} />
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir permanentemente a conexão "{selectedConnection?.connection_code}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
