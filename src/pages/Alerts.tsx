import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAlerts } from '@/hooks/useAlerts';
import { AlertList } from '@/components/notifications/AlertList';
import { Badge } from '@/components/ui/badge';

export default function Alerts() {
  const { alerts: activeAlerts } = useAlerts({ status: 'active' });
  const { alerts: acknowledgedAlerts } = useAlerts({ status: 'acknowledged' });
  const { alerts: resolvedAlerts } = useAlerts({ status: 'resolved' });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Alertas de Capacidade</h1>
          <p className="text-muted-foreground">
            Gerenciamento de alertas de ocupação de racks e portas
          </p>
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
            <Card>
              <AlertList />
            </Card>
          </TabsContent>

          <TabsContent value="acknowledged" className="mt-6">
            <Card>
              <AlertList />
            </Card>
          </TabsContent>

          <TabsContent value="resolved" className="mt-6">
            <Card>
              <AlertList />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
