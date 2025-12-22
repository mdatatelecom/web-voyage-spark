import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useUsers, UserRole } from '@/hooks/useUsers';
import { useUserRole } from '@/hooks/useUserRole';
import { useWhatsAppProfilePicture } from '@/hooks/useWhatsAppProfilePicture';
import { UserRoleDialog } from '@/components/users/UserRoleDialog';
import { UserCreateDialog } from '@/components/users/UserCreateDialog';
import { UserEditDialog } from '@/components/users/UserEditDialog';
import { Plus, X, UserPlus, Pencil, User, Download, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function Users() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { users, isLoading, error, accessLogs, logsLoading, removeRole, updateProfile } = useUsers();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const { fetchAndUpdateProfilePicture } = useWhatsAppProfilePicture();
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isBatchFetching, setIsBatchFetching] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    email: string;
    full_name?: string;
    phone?: string;
    avatar_url?: string;
    avatar_updated_at?: string;
  } | null>(null);

  // Calculate users without avatar
  const usersWithoutAvatar = users?.filter(u => !u.avatar_url && u.phone) || [];

  const handleBatchFetchPhotos = async () => {
    if (!users || usersWithoutAvatar.length === 0) {
      toast.info('Todos os usuários com telefone já possuem foto');
      return;
    }
    
    setIsBatchFetching(true);
    setBatchProgress({ current: 0, total: usersWithoutAvatar.length });
    
    let success = 0;
    let failed = 0;
    
    for (let i = 0; i < usersWithoutAvatar.length; i++) {
      const user = usersWithoutAvatar[i];
      setBatchProgress({ current: i + 1, total: usersWithoutAvatar.length });
      
      try {
        const result = await fetchAndUpdateProfilePicture(user.id, user.phone!, true);
        if (result) success++;
        else failed++;
      } catch {
        failed++;
      }
      
      // Delay entre requisições para não sobrecarregar a API
      if (i < usersWithoutAvatar.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
    
    setIsBatchFetching(false);
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    
    toast.success(`Busca concluída: ${success} sucesso, ${failed} falhas`);
  };

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

  const handleEditUser = (user: typeof selectedUser) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const handleSaveProfile = async (userId: string, data: { full_name: string; phone: string }) => {
    await updateProfile({ userId, data });
  };

  // Verificação dupla de admin - redireciona se não for admin
  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, roleLoading, navigate]);

  if (roleLoading) {
    return (
      <AppLayout>
        <div className="text-center py-12">Verificando permissões...</div>
      </AppLayout>
    );
  }

  if (!isAdmin) {
    return null; // Será redirecionado pelo useEffect
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="text-center py-12">Carregando...</div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-destructive mb-2">Erro ao carregar usuários</p>
          <p className="text-muted-foreground text-sm">{(error as Error).message}</p>
        </div>
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
            <Button 
              variant="outline" 
              onClick={handleBatchFetchPhotos}
              disabled={isBatchFetching || usersWithoutAvatar.length === 0}
            >
              {isBatchFetching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {batchProgress.current}/{batchProgress.total}
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Buscar Fotos ({usersWithoutAvatar.length})
                </>
              )}
            </Button>
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
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users && users.length > 0 ? (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar_url || undefined} alt={user.full_name || user.email} />
                              <AvatarFallback className="bg-muted">
                                {user.full_name ? user.full_name[0].toUpperCase() : <User className="h-4 w-4" />}
                              </AvatarFallback>
                            </Avatar>
                            <span>{user.full_name || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.phone || '-'}
                        </TableCell>
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
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditUser(user)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setRoleDialogOpen(true)}
                            >
                              Adicionar Role
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
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
        <UserEditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          user={selectedUser}
          onSave={handleSaveProfile}
        />
      </div>
    </AppLayout>
  );
}
