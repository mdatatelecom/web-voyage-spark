import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useSubnets } from '@/hooks/useSubnets';
import { SubnetWizard } from '@/components/ipam/SubnetWizard';
import { formatIPCount } from '@/lib/cidr-utils';
import { 
  Network, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Eye, 
  Trash2,
  Building2,
  Filter
} from 'lucide-react';

export default function Subnets() {
  const navigate = useNavigate();
  const { subnets, isLoading, deleteSubnet, isDeleting } = useSubnets();
  
  const [search, setSearch] = useState('');
  const [versionFilter, setVersionFilter] = useState<string>('all');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [subnetToDelete, setSubnetToDelete] = useState<string | null>(null);

  // Filter subnets
  const filteredSubnets = subnets.filter(subnet => {
    const matchesSearch = 
      subnet.name.toLowerCase().includes(search.toLowerCase()) ||
      subnet.cidr.toLowerCase().includes(search.toLowerCase());
    
    const matchesVersion = versionFilter === 'all' || subnet.ip_version === versionFilter;
    
    return matchesSearch && matchesVersion;
  });

  // Calculate stats
  const totalSubnets = subnets.length;
  const ipv4Count = subnets.filter(s => s.ip_version === 'ipv4').length;
  const ipv6Count = subnets.filter(s => s.ip_version === 'ipv6').length;

  const handleDelete = async () => {
    if (!subnetToDelete) return;
    await deleteSubnet(subnetToDelete);
    setDeleteDialogOpen(false);
    setSubnetToDelete(null);
  };

  const getOccupancyPercentage = (subnet: typeof subnets[0]) => {
    const used = (subnet.used_count || 0) + (subnet.reserved_count || 0);
    const total = subnet.usable_addresses;
    if (total === 0) return 0;
    return Math.round((used / total) * 100);
  };

  const getOccupancyColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-destructive';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-primary';
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Gerenciar IPs</h1>
            <p className="text-muted-foreground">
              Gerencie sub-redes e endereços IP do seu datacenter
            </p>
          </div>
          <Button onClick={() => setWizardOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Sub-rede
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Sub-redes</CardTitle>
              <Network className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSubnets}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">IPv4</CardTitle>
              <Badge variant="default">IPv4</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ipv4Count}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">IPv6</CardTitle>
              <Badge variant="secondary">IPv6</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ipv6Count}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou CIDR..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={versionFilter} onValueChange={setVersionFilter}>
            <SelectTrigger className="w-[150px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filtrar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ipv4">IPv4</SelectItem>
              <SelectItem value="ipv6">IPv6</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CIDR</TableHead>
                  <TableHead>Versão</TableHead>
                  <TableHead>Ocupação</TableHead>
                  <TableHead>Gateway</TableHead>
                  <TableHead>Prédio</TableHead>
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
                ) : filteredSubnets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      {search ? 'Nenhuma sub-rede encontrada' : 'Nenhuma sub-rede cadastrada'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubnets.map((subnet) => {
                    const occupancy = getOccupancyPercentage(subnet);
                    return (
                      <TableRow 
                        key={subnet.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/ipam/${subnet.id}`)}
                      >
                        <TableCell className="font-medium">{subnet.name}</TableCell>
                        <TableCell className="font-mono text-sm">{subnet.cidr}</TableCell>
                        <TableCell>
                          <Badge variant={subnet.ip_version === 'ipv4' ? 'default' : 'secondary'}>
                            {subnet.ip_version.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Progress 
                                value={occupancy} 
                                className="h-2 w-20"
                              />
                              <span className="text-xs text-muted-foreground">
                                {occupancy}%
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {(subnet.used_count || 0) + (subnet.reserved_count || 0)} / {formatIPCount(subnet.usable_addresses)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {subnet.gateway_ip || '-'}
                        </TableCell>
                        <TableCell>
                          {subnet.building ? (
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{subnet.building.name}</span>
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/ipam/${subnet.id}`);
                              }}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver Detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSubnetToDelete(subnet.id);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Wizard Dialog */}
      <SubnetWizard open={wizardOpen} onOpenChange={setWizardOpen} />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Sub-rede</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta sub-rede? 
              Todos os IPs associados também serão excluídos. 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
