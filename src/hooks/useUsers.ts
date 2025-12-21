import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type UserRole = 'admin' | 'technician' | 'viewer' | 'network_viewer';

interface User {
  id: string;
  email: string;
  created_at: string;
  roles: UserRole[];
  full_name?: string;
  phone?: string;
}

export const useUsers = () => {
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      // Call edge function to get users list
      const { data: usersData, error: usersError } = await supabase.functions.invoke('admin-list-users');

      if (usersError) throw usersError;

      // Get roles for all users
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Get profiles for all users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, phone');

      if (profilesError) throw profilesError;

      // Combine users with their roles and profiles
      const usersWithRoles: User[] = usersData.users.map((user: any) => {
        const profile = profilesData.find((p) => p.id === user.id);
        return {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          roles: rolesData
            .filter((r) => r.user_id === user.id)
            .map((r) => r.role as UserRole),
          full_name: profile?.full_name || '',
          phone: profile?.phone || '',
        };
      });

      return usersWithRoles;
    },
  });

  const { data: accessLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['access-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('access_logs')
        .select(`
          *,
          connection:connections(connection_code)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role,
          assigned_by: (await supabase.auth.getUser()).data.user?.id,
        });

      if (error) {
        if (error.code === '23505') {
          throw new Error('Usuário já possui esta role');
        }
        throw error;
      }

      // Log the action
      await supabase.from('access_logs').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'role_assigned',
        details: { target_user_id: userId, role },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['access-logs'] });
      toast.success('Role atribuída com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;

      // Log the action
      await supabase.from('access_logs').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'role_removed',
        details: { target_user_id: userId, role },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['access-logs'] });
      toast.success('Role removida com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover role: ${error.message}`);
    },
  });

  const findUserByEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      const { data, error } = await supabase.functions.invoke('admin-find-user-by-email', {
        body: { email },
      });

      if (error) throw error;
      return data.user;
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: { full_name: string; phone: string } }) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name,
          phone: data.phone,
        })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Perfil atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar perfil: ${error.message}`);
    },
  });

  return {
    users,
    isLoading,
    accessLogs,
    logsLoading,
    assignRole: assignRoleMutation.mutate,
    removeRole: removeRoleMutation.mutate,
    findUserByEmail: findUserByEmailMutation.mutateAsync,
    updateProfile: updateProfileMutation.mutateAsync,
    isAssigning: assignRoleMutation.isPending,
  };
};
