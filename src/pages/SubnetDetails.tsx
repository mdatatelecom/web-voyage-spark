import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSubnet } from '@/hooks/useSubnets';
import { useIPAddresses, type IPAddress, type IPAddressFilters } from '@/hooks/useIPAddresses';
import { formatIPCount, parseCIDR } from '@/lib/cidr-utils';
import { generateAndUpsertIPsForSubnet } from '@/lib/ipam-utils';
import { toast } from 'sonner';
import { 
  Network, 
  ArrowLeft, 
  Search, 
  MoreHorizontal,
  Server,
  Lock,
  Unlock,
  Edit,
  Filter,
  Globe,
  Router,
  Radio,
  Plus,
  Loader2
} from 'lucide-react';

export default function SubnetDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { data: subnet, isLoading: subnetLoading } = useSubnet(id);
  
  const [filters, setFilters] = useState<IPAddressFilters>({
    status: 'all',
    search: ''
  });
  
  const { 
    ipAddresses, 
    isLoading: ipsLoading, 
    updateIP, 
    isUpdating,
    releaseFromEquipment 
  } = useIPAddresses(id, filters);
  
  const [editDialog, setEditDialog] = useState(false);
  const [selectedIP, setSelectedIP] = useState<IPAddress | null>(null);
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState<'available' | 'reserved' | 'used'>('available');
  const [editNotes, setEditNotes] = useState('');
  
  // Generate IPs dialog state
  const [generateDialog, setGenerateDialog] = useState(false);
  const [reserveGateway, setReserveGateway] = useState(true);
  const [gatewayName, setGatewayName] = useState('Gateway');
  const [isGenerating, setIsGenerating] = useState(false);

  const isLoading = subnetLoading || ipsLoading;

  // Calculate stats
  const usedCount = ipAddresses.filter(ip => ip.status === 'used').length;
  const reservedCount = ipAddresses.filter(ip => ip.status === 'reserved').length;
  const availableCount = ipAddresses.filter(ip => ip.status === 'available').length;
  const occupancy = subnet ? Math.round(((usedCount + reservedCount) / subnet.usable_addresses) * 100) : 0;

  const handleEditIP = (ip: IPAddress) => {
    setSelectedIP(ip);
    setEditName(ip.name || '');
    setEditStatus(ip.status);
    setEditNotes(ip.notes || '');
    setEditDialog(true);
  };

  const handleSaveIP = async () => {
    if (!selectedIP) return;
    
    await updateIP({
      id: selectedIP.id,
      name: editName || null,
      status: editStatus,
      notes: editNotes || null
    });
    
    setEditDialog(false);
    setSelectedIP(null);
  };

  const handleRelease = async (ip: IPAddress) => {
    await releaseFromEquipment(ip.id);
  };

  const handleGenerateIPs = async () => {
    if (!subnet || !id) return;
    
    setIsGenerating(true);
    try {
      const result = await generateAndUpsertIPsForSubnet({
        subnetId: id,
        cidr: subnet.cidr,
        reserveGateway,
        gatewayName: gatewayName || 'Gateway'
      });
      
      if (result.success) {
        toast.success(`${result.count} IPs gerados com sucesso!`);
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['ip-addresses'] });
        queryClient.invalidateQueries({ queryKey: ['available-ips'] });
        queryClient.invalidateQueries({ queryKey: ['available-ips-by-vlan'] });
        queryClient.invalidateQueries({ queryKey: ['subnets'] });
        setGenerateDialog(false);
      } else {
        toast.error(result.error || 'Erro ao gerar IPs');
      }
    } catch (error) {
      console.error('Error generating IPs:', error);
      toast.error('Erro ao gerar IPs');
    } finally {
      setIsGenerating(false);
    }
  };

  const parsedCIDR = subnet ? parseCIDR(subnet.cidr) : null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'used':
        return <Badge variant="default">Em Uso</Badge>;
      case 'reserved':
        return <Badge variant="secondary">Reservado</Badge>;
      default:
        return <Badge variant="outline">Livre</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'network':
        return <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800">Network</Badge>;
      case 'gateway':
        return <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">Gateway</Badge>;
      case 'broadcast':
        return <Badge variant="outline" className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200">Broadcast</Badge>;
      case 'reserved':
        return <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">Reservado</Badge>;
      default:
        return <Badge variant="outline">Host</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'network':
        return <Globe className="h-4 w-4 text-slate-500" />;
      case 'gateway':
        return <Router className="h-4 w-4 text-blue-500" />;
      case 'broadcast':
        return <Radio className="h-4 w-4 text-orange-500" />;
      default:
        return <Server className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (subnetLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p>Carregando...</p>
        </div>
      </AppLayout>
    );
  }

  if (!subnet) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p>Sub-rede não encontrada</p>
          <Button onClick={() => navigate('/ipam')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/ipam')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{subnet.name}</h1>
              <Badge variant={subnet.ip_version === 'ipv4' ? 'default' : 'secondary'}>
                {subnet.ip_version.toUpperCase()}
              </Badge>
            </div>
            <p className="text-muted-foreground font-mono">{subnet.cidr}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ocupação</CardTitle>
              <Network className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{occupancy}%</div>
              <Progress value={occupancy} className="mt-2" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Uso</CardTitle>
              <Server className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usedCount}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reservados</CardTitle>
              <Lock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reservedCount}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Livres</CardTitle>
              <Unlock className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{availableCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Subnet Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações da Sub-rede</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Endereço de Rede</p>
                <p className="font-mono">{subnet.network_address}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gateway</p>
                <p className="font-mono">{subnet.gateway_ip || '-'}</p>
                {subnet.gateway_name && (
                  <p className="text-xs text-muted-foreground">{subnet.gateway_name}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Broadcast</p>
                <p className="font-mono">{subnet.broadcast_address || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de IPs</p>
                <p>{formatIPCount(subnet.total_addresses)} ({formatIPCount(subnet.usable_addresses)} utilizáveis)</p>
              </div>
              {subnet.vlan_id && (
                <div>
                  <p className="text-sm text-muted-foreground">VLAN</p>
                  <p>{subnet.vlan_id}</p>
                </div>
              )}
              {subnet.building && (
                <div>
                  <p className="text-sm text-muted-foreground">Prédio</p>
                  <p>{subnet.building.name}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por IP ou nome..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-9"
            />
          </div>
          
          <Select 
            value={filters.status} 
            onValueChange={(value) => setFilters(prev => ({ ...prev, status: value as IPAddressFilters['status'] }))}
          >
            <SelectTrigger className="w-[150px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="available">Livres</SelectItem>
              <SelectItem value="reserved">Reservados</SelectItem>
              <SelectItem value="used">Em Uso</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* IP Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Endereço IP</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Equipamento</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : ipAddresses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      {filters.search || filters.status !== 'all' ? (
                        'Nenhum IP encontrado com os filtros aplicados'
                      ) : subnet?.ip_version === 'ipv4' ? (
                        <div className="space-y-3">
                          <p className="text-muted-foreground">Nenhum IP cadastrado nesta sub-rede</p>
                          <Button onClick={() => setGenerateDialog(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Gerar IPs agora
                          </Button>
                        </div>
                      ) : (
                        'Nenhum IP cadastrado nesta sub-rede'
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  ipAddresses.map((ip) => (
                    <TableRow key={ip.id}>
                      <TableCell>{getTypeIcon(ip.ip_type)}</TableCell>
                      <TableCell className="font-mono">{ip.ip_address}</TableCell>
                      <TableCell>{ip.name || '-'}</TableCell>
                      <TableCell>{getTypeBadge(ip.ip_type)}</TableCell>
                      <TableCell>{getStatusBadge(ip.status)}</TableCell>
                      <TableCell>
                        {ip.equipment ? (
                          <Button
                            variant="link"
                            className="p-0 h-auto"
                            onClick={() => navigate(`/equipment/${ip.equipment!.id}`)}
                          >
                            {ip.equipment.name}
                          </Button>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {ip.ip_type === 'host' && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditIP(ip)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              {ip.equipment_id && (
                                <DropdownMenuItem onClick={() => handleRelease(ip)}>
                                  <Unlock className="mr-2 h-4 w-4" />
                                  Liberar
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar IP</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Endereço IP</Label>
              <Input value={selectedIP?.ip_address || ''} disabled className="font-mono" />
            </div>
            
            <div>
              <Label htmlFor="ipName">Nome</Label>
              <Input
                id="ipName"
                placeholder="Ex: Servidor Web 01"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="ipStatus">Status</Label>
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as typeof editStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Livre</SelectItem>
                  <SelectItem value="reserved">Reservado</SelectItem>
                  <SelectItem value="used">Em Uso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="ipNotes">Observações</Label>
              <Textarea
                id="ipNotes"
                placeholder="Observações..."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveIP} disabled={isUpdating}>
              {isUpdating ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate IPs Dialog */}
      <Dialog open={generateDialog} onOpenChange={setGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar IPs para esta Sub-rede</DialogTitle>
            <DialogDescription>
              Isso criará registros de IP para todos os endereços disponíveis nesta sub-rede.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">CIDR:</span>
                <span className="font-mono">{subnet?.cidr}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">IPs a gerar:</span>
                <span className="font-bold">{parsedCIDR ? parsedCIDR.totalAddresses.toLocaleString() : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">IPs utilizáveis:</span>
                <span>{parsedCIDR ? parsedCIDR.usableAddresses.toLocaleString() : '-'}</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="reserve-gateway" className="font-medium">Reservar Gateway</Label>
                <p className="text-sm text-muted-foreground">
                  Marcar o segundo IP como gateway reservado
                </p>
              </div>
              <Switch
                id="reserve-gateway"
                checked={reserveGateway}
                onCheckedChange={setReserveGateway}
              />
            </div>

            {reserveGateway && (
              <div className="space-y-2">
                <Label htmlFor="gateway-name">Nome do Gateway</Label>
                <Input
                  id="gateway-name"
                  value={gatewayName}
                  onChange={(e) => setGatewayName(e.target.value)}
                  placeholder="Ex: Gateway Principal"
                />
              </div>
            )}

            {parsedCIDR && parsedCIDR.totalAddresses > 4096 && (
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-lg text-sm">
                <strong>Atenção:</strong> Esta rede é grande ({parsedCIDR.totalAddresses.toLocaleString()} IPs). 
                Apenas os endereços especiais (network, gateway, broadcast) serão criados.
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDialog(false)} disabled={isGenerating}>
              Cancelar
            </Button>
            <Button onClick={handleGenerateIPs} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Gerar IPs
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
