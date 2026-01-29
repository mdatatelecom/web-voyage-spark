import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Radar, Server, Clipboard, ListFilter, HardHat } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAlerts, AlertType } from '@/hooks/useAlerts';
import { useUserRole } from '@/hooks/useUserRole';
import { AlertList } from '@/components/notifications/AlertList';

type AlertTypeFilter = 'all' | 'capacity' | 'audit' | 'zabbix' | 'epi';

export default function Alerts() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAdmin } = useUserRole();
  const [activeTab, setActiveTab] = useState('active');
  const [typeFilter, setTypeFilter] = useState<AlertTypeFilter>('all');
  
  // Sync filter from URL query param
  useEffect(() => {
    const typeParam = searchParams.get('type');
    if (typeParam === 'zabbix' || typeParam === 'epi' || typeParam === 'capacity' || typeParam === 'audit') {
      setTypeFilter(typeParam);
    }
  }, [searchParams]);
  
  // Map type filter to actual alert types
  const getTypeFilterValue = (): AlertType | undefined => {
    switch (typeFilter) {
      case 'capacity':
        return 'rack_capacity';
      case 'audit':
        return 'camera_unassigned';
      case 'zabbix':
        return 'zabbix_alert';
      case 'epi':
        return 'epi_alert';
      default:
        return undefined;
    }
  };

  const typeFilterValue = getTypeFilterValue();
  
  const { alerts: activeAlerts } = useAlerts({ status: 'active', type: typeFilterValue });
  const { alerts: acknowledgedAlerts } = useAlerts({ status: 'acknowledged', type: typeFilterValue });
  const { alerts: resolvedAlerts } = useAlerts({ status: 'resolved', type: typeFilterValue });

  const getTypeFilterLabel = () => {
    switch (typeFilter) {
      case 'capacity':
        return 'Capacidade';
      case 'audit':
        return 'Auditoria';
      case 'zabbix':
        return 'Zabbix';
      case 'epi':
        return 'EPI Monitor';
      default:
        return 'Todos os tipos';
    }
  };

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
          <div className="flex gap-2">
            {isAdmin && (
              <Button variant="outline" onClick={() => navigate('/alert-settings')}>
                <Settings className="w-4 h-4 mr-2" />
                Configurar Alertas
              </Button>
            )}
          </div>
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-2">
          <ListFilter className="w-4 h-4 text-muted-foreground" />
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as AlertTypeFilter)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <span className="flex items-center gap-2">
                  <Clipboard className="w-4 h-4" />
                  Todos os tipos
                </span>
              </SelectItem>
              <SelectItem value="capacity">
                <span className="flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  Capacidade
                </span>
              </SelectItem>
              <SelectItem value="audit">
                <span className="flex items-center gap-2">
                  <Clipboard className="w-4 h-4" />
                  Auditoria
                </span>
              </SelectItem>
              <SelectItem value="zabbix">
                <span className="flex items-center gap-2">
                  <Radar className="w-4 h-4" />
                  Zabbix
                </span>
              </SelectItem>
              <SelectItem value="epi">
                <span className="flex items-center gap-2">
                  <HardHat className="w-4 h-4" />
                  EPI Monitor
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
          {typeFilter !== 'all' && (
            <Badge variant="secondary">{getTypeFilterLabel()}</Badge>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
            <AlertList status="active" type={typeFilterValue} />
          </TabsContent>

          <TabsContent value="acknowledged" className="mt-6">
            <AlertList status="acknowledged" type={typeFilterValue} />
          </TabsContent>

          <TabsContent value="resolved" className="mt-6">
            <AlertList status="resolved" type={typeFilterValue} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
