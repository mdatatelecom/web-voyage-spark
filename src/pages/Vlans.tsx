import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useVlans, VLAN_CATEGORIES, Vlan } from '@/hooks/useVlans';
import { VlanWizard } from '@/components/ipam/VlanWizard';
import { 
  Plus, 
  Search, 
  Network, 
  Trash2, 
  Eye,
  Monitor,
  Phone,
  Settings,
  Users,
  Link,
  Cpu,
  Loader2
} from 'lucide-react';

const getCategoryIcon = (category: string) => {
  const icons: Record<string, React.ReactNode> = {
    data: <Monitor className="h-4 w-4" />,
    voice: <Phone className="h-4 w-4" />,
    management: <Settings className="h-4 w-4" />,
    guest: <Users className="h-4 w-4" />,
    native: <Link className="h-4 w-4" />,
    iot: <Cpu className="h-4 w-4" />,
  };
  return icons[category] || <Network className="h-4 w-4" />;
};

export default function Vlans() {
  const navigate = useNavigate();
  const { vlans, isLoading, deleteVlan, isDeleting } = useVlans();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vlanToDelete, setVlanToDelete] = useState<Vlan | null>(null);
  
  // Filter VLANs
  const filteredVlans = vlans.filter((vlan) => {
    const matchesSearch = 
      vlan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vlan.vlan_id.toString().includes(searchQuery) ||
      vlan.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || vlan.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });
  
  // Statistics
  const stats = {
    total: vlans.length,
    byCategory: VLAN_CATEGORIES.reduce((acc, cat) => {
      acc[cat.value] = vlans.filter(v => v.category === cat.value).length;
      return acc;
    }, {} as Record<string, number>),
    withSubnets: vlans.filter(v => (v.subnet_count || 0) > 0).length,
  };
  
  const handleDelete = async () => {
    if (vlanToDelete) {
      await deleteVlan(vlanToDelete.id);
      setDeleteDialogOpen(false);
      setVlanToDelete(null);
    }
  };
  
  const getCategoryLabel = (category: string) => {
    return VLAN_CATEGORIES.find(c => c.value === category)?.label || category;
  };
  
  const getCategoryColor = (category: string) => {
    return VLAN_CATEGORIES.find(c => c.value === category)?.color || '#6b7280';
  };
  
  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Gerenciamento de VLANs</h1>
            <p className="text-muted-foreground">
              Configure e gerencie VLANs do datacenter
            </p>
          </div>
          <Button onClick={() => setWizardOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova VLAN
          </Button>
        </div>
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de VLANs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Com Sub-redes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.withSubnets}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Dados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-blue-500" />
                <span className="text-2xl font-bold">{stats.byCategory.data || 0}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Voz
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-green-500" />
                <span className="text-2xl font-bold">{stats.byCategory.voice || 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por ID ou nome..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {VLAN_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(cat.value)}
                    <span>{cat.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* VLANs Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredVlans.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Network className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">Nenhuma VLAN encontrada</p>
                <p className="text-sm">
                  {searchQuery || categoryFilter !== 'all'
                    ? 'Tente ajustar os filtros'
                    : 'Clique em "Nova VLAN" para criar'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">VLAN ID</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Sub-redes</TableHead>
                    <TableHead>Conexões</TableHead>
                    <TableHead>Prédio</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVlans.map((vlan) => (
                    <TableRow key={vlan.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {vlan.vlan_id}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{vlan.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: getCategoryColor(vlan.category) }}
                          />
                          <span>{getCategoryLabel(vlan.category)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {vlan.subnet_count || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {vlan.connection_count || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {vlan.building_name || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={vlan.is_active ? 'default' : 'secondary'}>
                          {vlan.is_active ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/vlans/${vlan.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setVlanToDelete(vlan);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* VLAN Wizard */}
      <VlanWizard open={wizardOpen} onOpenChange={setWizardOpen} />
      
      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir VLAN?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A VLAN{' '}
              <strong>{vlanToDelete?.name}</strong> (ID: {vlanToDelete?.vlan_id})
              será removida permanentemente.
              {(vlanToDelete?.subnet_count || 0) > 0 && (
                <span className="block mt-2 text-amber-600">
                  Atenção: Esta VLAN possui {vlanToDelete?.subnet_count} sub-rede(s) associada(s).
                </span>
              )}
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
