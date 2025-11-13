import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUsers, UserRole } from '@/hooks/useUsers';
import { UserRoleDialog } from '@/components/users/UserRoleDialog';
import { UserCreateDialog } from '@/components/users/UserCreateDialog';
import { Plus, X, UserPlus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function Users() {
  const queryClient = useQueryClient();
  const { users, isLoading, accessLogs, logsLoading, removeRole } = useUsers();
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const getRoleBadgeColor = (role: UserRole) => {
    const colors = {
      admin: 'bg-red-500',
      technician: 'bg-blue-500',
      viewer: 'bg-gray-500',
      network_viewer: 'bg-purple-500',
    };
    return colors[role] || 'bg-gray-500';
  };

  const getRoleLabel = (role: UserRole) => {
    const labels = {
      admin: 'Admin',
      technician: 'Técnico',
      viewer: 'Visualizador',
      network_viewer: 'Visualizador de Rede',
    };
    return labels[role] || role;
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      connection_created: 'Conexão criada',
      connection_updated: 'Conexão atualizada',
      connection_deleted: 'Conexão excluída',
      label_generated: 'Etiqueta gerada',
      label_printed: 'Etiqueta impressa',
      role_assigned: 'Role atribuída',
      role_removed: 'Role removida',
      port_created: 'Porta criada',
      port_updated: 'Porta atualizada',
    };
    return labels[action] || action;
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="text-center py-12">Carregando...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gerenciamento de Usuários</h1>
            <p className="text-muted-foreground">
              Gerenciar usuários, roles e visualizar logs de acesso
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setCreateDialogOpen(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Cadastrar Usuário
            </Button>
            <Button variant="outline" onClick={() => setRoleDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Atribuir Role
            </Button>
          </div>
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">Usuários ({users?.length || 0})</TabsTrigger>
            <TabsTrigger value="logs">Logs de Acesso</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users && users.length > 0 ? (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.roles.length > 0 ? (
                              user.roles.map((role) => (
                                <Badge
                                  key={role}
                                  className={`${getRoleBadgeColor(role)} text-white`}
                                >
                                  {getRoleLabel(role)}
                                  <button
                                    onClick={() => removeRole({ userId: user.id, role })}
                                    className="ml-2 hover:bg-black/20 rounded-full p-0.5"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                Sem roles
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRoleDialogOpen(true)}
                          >
                            Adicionar Role
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                        Nenhum usuário encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Logs Recentes</h3>
              {logsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando logs...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Conexão</TableHead>
                      <TableHead>Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accessLogs && accessLogs.length > 0 ? (
                      accessLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-muted-foreground">
                            {new Date(log.created_at).toLocaleString('pt-BR')}
                          </TableCell>
                          <TableCell>-</TableCell>
                          <TableCell>
                            <Badge variant="outline">{getActionLabel(log.action)}</Badge>
                          </TableCell>
                          <TableCell>
                            {log.connection?.connection_code || '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {log.details ? JSON.stringify(log.details) : '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                          Nenhum log encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        <UserCreateDialog 
          open={createDialogOpen} 
          onOpenChange={setCreateDialogOpen}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['admin-users'] })}
        />
        <UserRoleDialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen} />
      </div>
    </AppLayout>
  );
}
