import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAlerts } from '@/hooks/useAlerts';
import { useUserRole } from '@/hooks/useUserRole';
import { AlertList } from '@/components/notifications/AlertList';

export default function Alerts() {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const { alerts: activeAlerts } = useAlerts({ status: 'active' });
  const { alerts: acknowledgedAlerts } = useAlerts({ status: 'acknowledged' });
  const { alerts: resolvedAlerts } = useAlerts({ status: 'resolved' });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Alertas</h1>
            <p className="text-muted-foreground">
              Gerencie alertas de capacidade do sistema
            </p>
          </div>
          {isAdmin && (
            <Button variant="outline" onClick={() => navigate('/alert-settings')}>
              <Settings className="w-4 h-4 mr-2" />
              Configurar Alertas
            </Button>
          )}
        </div>

        <Tabs defaultValue="active" className="w-full">
          <TabsList>
            <TabsTrigger value="active" className="relative">
              Ativos
              {activeAlerts && activeAlerts.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {activeAlerts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="acknowledged">
              Lidos
              {acknowledgedAlerts && acknowledgedAlerts.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {acknowledgedAlerts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="resolved">Resolvidos</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            <AlertList />
          </TabsContent>

          <TabsContent value="acknowledged" className="mt-6">
            <AlertList />
          </TabsContent>

          <TabsContent value="resolved" className="mt-6">
            <AlertList />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
