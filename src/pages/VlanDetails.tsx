import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useVlan, useVlans, VLAN_CATEGORIES } from '@/hooks/useVlans';
import { useSubnets } from '@/hooks/useSubnets';
import { 
  ArrowLeft, 
  Network, 
  Monitor, 
  Phone, 
  Settings, 
  Users, 
  Link, 
  Cpu,
  Building2,
  Calendar,
  Info,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const getCategoryIcon = (category: string) => {
  const icons: Record<string, React.ReactNode> = {
    data: <Monitor className="h-5 w-5" />,
    voice: <Phone className="h-5 w-5" />,
    management: <Settings className="h-5 w-5" />,
    guest: <Users className="h-5 w-5" />,
    native: <Link className="h-5 w-5" />,
    iot: <Cpu className="h-5 w-5" />,
  };
  return icons[category] || <Network className="h-5 w-5" />;
};

export default function VlanDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: vlan, isLoading } = useVlan(id);
  const { subnets } = useSubnets();
  
  // Filter subnets that belong to this VLAN (by vlan_id number)
  const vlanSubnets = subnets.filter(s => vlan && s.vlan_id === vlan.vlan_id);
  
  const getCategoryLabel = (category: string) => {
    return VLAN_CATEGORIES.find(c => c.value === category)?.label || category;
  };
  
  const getCategoryColor = (category: string) => {
    return VLAN_CATEGORIES.find(c => c.value === category)?.color || '#6b7280';
  };
  
  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-64 col-span-2" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </AppLayout>
    );
  }
  
  if (!vlan) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <Network className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">VLAN não encontrada</h2>
          <Button variant="outline" onClick={() => navigate('/vlans')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para VLANs
          </Button>
        </div>
      </AppLayout>
    );
  }
  
  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/vlans')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{vlan.name}</h1>
                <Badge variant="outline" className="font-mono text-lg">
                  VLAN {vlan.vlan_id}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {vlan.description || 'Sem descrição'}
              </p>
            </div>
          </div>
          
          <Badge variant={vlan.is_active ? 'default' : 'secondary'}>
            {vlan.is_active ? 'Ativa' : 'Inativa'}
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Info */}
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Informações Gerais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">VLAN ID</span>
                  <p className="font-mono text-lg font-medium">{vlan.vlan_id}</p>
                </div>
                
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Categoria</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: getCategoryColor(vlan.category) }}
                    />
                    {getCategoryIcon(vlan.category)}
                    <span className="font-medium">{getCategoryLabel(vlan.category)}</span>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Prédio</span>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{vlan.building_name || 'Não associado'}</span>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Criado em</span>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {format(new Date(vlan.created_at), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              </div>
              
              {vlan.description && (
                <div className="pt-4 border-t">
                  <span className="text-sm text-muted-foreground">Descrição</span>
                  <p className="mt-1">{vlan.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                Estatísticas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <span className="text-3xl font-bold">{vlanSubnets.length}</span>
                <p className="text-sm text-muted-foreground">Sub-redes Associadas</p>
              </div>
              
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <span className="text-3xl font-bold">
                  {vlanSubnets.reduce((acc, s) => acc + (s.used_count || 0), 0)}
                </span>
                <p className="text-sm text-muted-foreground">IPs em Uso</p>
              </div>
              
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <span className="text-3xl font-bold">
                  {vlanSubnets.reduce((acc, s) => acc + s.usable_addresses, 0).toLocaleString()}
                </span>
                <p className="text-sm text-muted-foreground">Total de IPs</p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Associated Subnets */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Sub-redes Associadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vlanSubnets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Network className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma sub-rede associada a esta VLAN</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CIDR</TableHead>
                    <TableHead>Gateway</TableHead>
                    <TableHead>Ocupação</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vlanSubnets.map((subnet) => {
                    const occupancy = subnet.usable_addresses > 0 
                      ? ((subnet.used_count || 0) / subnet.usable_addresses) * 100 
                      : 0;
                    
                    return (
                      <TableRow key={subnet.id}>
                        <TableCell className="font-medium">{subnet.name}</TableCell>
                        <TableCell className="font-mono">{subnet.cidr}</TableCell>
                        <TableCell className="font-mono">{subnet.gateway_ip || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${Math.min(occupancy, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {occupancy.toFixed(0)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={subnet.is_active ? 'default' : 'secondary'}>
                            {subnet.is_active ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/ipam/${subnet.id}`)}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
