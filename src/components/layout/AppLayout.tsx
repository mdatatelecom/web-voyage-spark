import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Network, LogOut, Home, Building, Package, Cable, Tag, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Breadcrumb } from './Breadcrumb';

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { roles, isAdmin, isTechnician } = useUserRole();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success('Logout realizado com sucesso!');
    navigate('/auth');
  };

  const menuItems = [
    { label: 'Dashboard', icon: Home, path: '/dashboard', visible: true },
    { label: 'Localizações', icon: Building2, path: '/buildings', visible: true },
    { label: 'Racks', icon: Package, path: '/racks', visible: true },
    { label: 'Equipamentos', icon: Cable, path: '/equipment', visible: isAdmin || isTechnician },
    { label: 'Conexões', icon: Network, path: '/connections', visible: isAdmin || isTechnician },
    { label: 'Etiquetas', icon: Tag, path: '/labels', visible: isAdmin || isTechnician },
    { label: 'Usuários', icon: Users, path: '/users', visible: isAdmin },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card">
        <div className="flex h-16 items-center px-6">
          <div className="flex items-center gap-2">
            <Network className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">InfraConnexus</h1>
          </div>

          <div className="ml-auto flex items-center gap-4">
            {user?.email && (
              <div className="flex flex-col items-end gap-1">
                <span className="text-sm font-medium text-foreground">{user.email}</span>
                <div className="flex gap-1">
                  {roles.map((role) => (
                    <Badge key={role} variant="secondary" className="text-xs">
                      {role === 'admin' ? 'Admin' : role === 'technician' ? 'Técnico' : 'Visualizador'}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="sticky top-16 h-[calc(100vh-4rem)] w-64 border-r bg-sidebar">
          <nav className="flex flex-col gap-1 p-4">
            {menuItems.map((item) => {
              if (!item.visible) return null;
              
              const Icon = item.icon;
              return (
                <Button
                  key={item.path}
                  variant="ghost"
                  className="justify-start gap-2"
                  onClick={() => navigate(item.path)}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          <div className="border-b bg-muted/30 px-6 py-3">
            <Breadcrumb />
          </div>
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
};
