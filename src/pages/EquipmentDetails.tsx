import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PortManageDialog } from '@/components/equipment/PortManageDialog';
import { PortStatusDialog } from '@/components/equipment/PortStatusDialog';
import { EquipmentEditDialog } from '@/components/equipment/EquipmentEditDialog';
import { PoeBudgetIndicator } from '@/components/equipment/PoeBudgetIndicator';
import { NvrChannelGrid } from '@/components/equipment/NvrChannelGrid';
import { NvrTopologyDiagram } from '@/components/equipment/NvrTopologyDiagram';
import { PlanCameraDialog } from '@/components/equipment/PlanCameraDialog';
import { PortLocationDialog } from '@/components/equipment/PortLocationDialog';
import { LocationGallery } from '@/components/equipment/LocationGallery';
import { OrphanImagesCleanup } from '@/components/equipment/OrphanImagesCleanup';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Edit, Plus, MoreHorizontal, Trash2, MapPin, Camera, ExternalLink, ZoomIn, FolderOpen, Play, Settings, Radar, AlertCircle, AlertTriangle, ChevronRight } from 'lucide-react';
import { useState, useMemo } from 'react';
import { CameraLiveDialog } from '@/components/equipment/CameraLiveDialog';
import { CameraAccessConfigDialog } from '@/components/equipment/CameraAccessConfigDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEquipment } from '@/hooks/useEquipment';
import { PORT_TYPES, PORT_TYPE_CATEGORIES, getEquipmentFieldConfig, EQUIPMENT_STATUS_OPTIONS, AIRFLOW_OPTIONS } from '@/constants/equipmentTypes';
import { useAlertsByEntity } from '@/hooks/useAlerts';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ZabbixAlertsSection } from '@/components/equipment/ZabbixAlertsSection';

// Parse equipment notes safely
const parseEquipmentNotes = (notes: string | null): Record<string, any> => {
  if (!notes) return {};
  try {
    return typeof notes === 'string' ? JSON.parse(notes) : notes;
  } catch {
    return {};
  }
};

// Extract location photo URL from notes (supports multiple key formats)
const extractLocationPhotoUrl = (notes: Record<string, any>): string | undefined => {
  return notes.location_image_url || 
         notes.locationPhotoUrl || 
         notes.location_photo_url ||
         notes.locationImageUrl ||
         undefined;
};

// Extract location description from notes
const extractLocationDescription = (notes: Record<string, any>): string | undefined => {
  return notes.location_description || 
         notes.locationDescription ||
         undefined;
};

// Extract live URL from notes
const extractLiveUrl = (notes: Record<string, any>): string | undefined => {
  return notes.live_url || notes.liveUrl || undefined;
};

export default function EquipmentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [portTypeFilter, setPortTypeFilter] = useState<string>('all');
  const [speedFilter, setSpeedFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const portsPerPage = 20;
const [portDialogOpen, setPortDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPortId, setSelectedPortId] = useState<string | null>(null);
  const [planCameraDialogOpen, setPlanCameraDialogOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<number>(1);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [selectedPortIdForLocation, setSelectedPortIdForLocation] = useState<string | null>(null);
  const [imageZoomOpen, setImageZoomOpen] = useState(false);
  const [orphanCleanupOpen, setOrphanCleanupOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedPortIdForStatus, setSelectedPortIdForStatus] = useState<string | null>(null);
  const [liveDialogOpen, setLiveDialogOpen] = useState(false);
  const [accessConfigDialogOpen, setAccessConfigDialogOpen] = useState(false);
  const { updateEquipment, deleteEquipment, isUpdating, isDeleting } = useEquipment();

  const { data: equipment, isLoading } = useQuery({
    queryKey: ['equipment', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment')
        .select(`
          *,
          rack:racks(
            name,
            size_u,
            room:rooms(
              name,
              floor:floors(
                name,
                floor_number,
                building:buildings(name)
              )
            )
          ),
          ports(
            id,
            name,
            port_number,
            port_type,
            status,
            speed,
            notes,
            connections_a:connections!connections_port_a_id_fkey(
              id,
              connection_code,
              status
            ),
            connections_b:connections!connections_port_b_id_fkey(
              id,
              connection_code,
              status
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      const portsWithConnections = data.ports.map((port: any) => {
        const connection = port.connections_a?.[0] || port.connections_b?.[0];
        return {
          ...port,
          connection: connection || null
        };
      });

      return {
        ...data,
        ports: portsWithConnections
      };
    },
    enabled: !!id
  });

  // Derive selected ports from equipment data to always get updated data
  const selectedPort = useMemo(() => {
    if (!selectedPortId || !equipment?.ports) return null;
    return equipment.ports.find((p: any) => p.id === selectedPortId) || null;
  }, [selectedPortId, equipment?.ports]);
  
  const selectedPortForLocation = useMemo(() => {
    if (!selectedPortIdForLocation || !equipment?.ports) return null;
    return equipment.ports.find((p: any) => p.id === selectedPortIdForLocation) || null;
  }, [selectedPortIdForLocation, equipment?.ports]);
  
  const selectedPortForStatus = useMemo(() => {
    if (!selectedPortIdForStatus || !equipment?.ports) return null;
    return equipment.ports.find((p: any) => p.id === selectedPortIdForStatus) || null;
  }, [selectedPortIdForStatus, equipment?.ports]);

  const filteredPorts = equipment?.ports?.filter((port: any) => {
    const matchesStatus = statusFilter === 'all' || port.status === statusFilter;
    const matchesPortType = portTypeFilter === 'all' || port.port_type === portTypeFilter;
    const matchesSpeed = speedFilter === 'all' || port.speed === speedFilter;
    const matchesSearch = port.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesPortType && matchesSpeed && matchesSearch;
  }) || [];
  
  // Get unique speeds from equipment's ports for filter
  const availableSpeeds = Array.from(new Set(equipment?.ports?.map((p: any) => p.speed).filter(Boolean))) as string[];

  const totalPages = Math.ceil(filteredPorts.length / portsPerPage);
  const startIndex = (currentPage - 1) * portsPerPage;
  const paginatedPorts = filteredPorts.slice(startIndex, startIndex + portsPerPage);

  const stats = {
    total: equipment?.ports?.length || 0,
    available: equipment?.ports?.filter((p: any) => p.status === 'available').length || 0,
    inUse: equipment?.ports?.filter((p: any) => p.status === 'in_use').length || 0,
    reserved: equipment?.ports?.filter((p: any) => p.status === 'reserved').length || 0,
    faulty: equipment?.ports?.filter((p: any) => p.status === 'faulty').length || 0
  };

  // Calculate PoE power usage for switch_poe or equipment with poe_budget_watts
  const poePowerData = useMemo(() => {
    if (!equipment) return null;
    
    const budgetWatts = equipment.poe_budget_watts || 0;
    if (budgetWatts <= 0 && equipment.type !== 'switch_poe') return null;
    
    const powerPerPort = (equipment.poe_power_per_port as Record<string, number>) || {};
    const usedWatts = Object.values(powerPerPort).reduce((sum, p) => sum + (p || 0), 0);
    const activePorts = equipment.ports?.filter((p: any) => p.status === 'in_use').length || 0;
    const totalPorts = equipment.ports?.length || 0;
    
    return {
      budgetWatts: budgetWatts || 370, // Default 370W if switch_poe without budget
      usedWatts,
      activePorts,
      totalPorts,
      powerPerPort
    };
  }, [equipment]);

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      switch: 'bg-blue-500',
      router: 'bg-green-500',
      server: 'bg-orange-500',
      patch_panel: 'bg-gray-500',
      firewall: 'bg-red-500'
    };
    return colors[type] || 'bg-gray-500';
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; color: string }> = {
      available: { label: 'Disponível', color: 'bg-green-500' },
      in_use: { label: 'Em Uso', color: 'bg-red-500' },
      reserved: { label: 'Reservado', color: 'bg-yellow-500' },
      disabled: { label: 'Desabilitado', color: 'bg-slate-500' },
      faulty: { label: 'Defeituoso', color: 'bg-gray-500' }
    };
    const { label, color } = config[status] || { label: status, color: 'bg-gray-500' };
    return <Badge className={color}>{label}</Badge>;
  };
  
  const getPortTypeLabel = (portType: string) => {
    const type = PORT_TYPES.find(pt => pt.value === portType);
    return type ? type.label : portType;
  };
  
  const handleUpdateEquipment = (updatedEquipment: any) => {
    // Don't pass the id inside updatedEquipment, use it as first param
    const { id: _unused, ...updates } = updatedEquipment;
    updateEquipment({
      id: id!,
      ...updates
    }, {
      onSuccess: () => {
        setEditDialogOpen(false);
      }
    });
  };
  
  const handleDeleteEquipment = () => {
    deleteEquipment(id!, {
      onSuccess: () => {
        navigate('/equipment');
      }
    });
  };
  
  const queryClient = useQueryClient();
  
  const handleStatusChange = async (portId: string, newStatus: string) => {
    const { error } = await supabase
      .from('ports')
      .update({ status: newStatus as 'available' | 'in_use' | 'reserved' | 'disabled' })
      .eq('id', portId);
      
    if (error) {
      throw error;
    }
    
    queryClient.invalidateQueries({ queryKey: ['equipment', id] });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="text-center py-12">Carregando...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{equipment?.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge className={getTypeColor(equipment?.type || '')}>
                {equipment?.type}
              </Badge>
              {equipment?.manufacturer && (
                <span className="text-muted-foreground">
                  {equipment.manufacturer} {equipment.model}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Editar Equipamento
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir o equipamento <strong>{equipment?.name}</strong>? Esta ação não pode ser desfeita e todas as portas associadas serão removidas.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteEquipment} disabled={isDeleting}>
                    {isDeleting ? 'Excluindo...' : 'Excluir'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button onClick={() => {
              setSelectedPortId(null);
              setPortDialogOpen(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Portas
            </Button>
            <Button variant="outline" onClick={() => setOrphanCleanupOpen(true)}>
              <FolderOpen className="w-4 h-4 mr-2" />
              Limpar Órfãs
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          <Card className="p-6 space-y-4">
            {/* Equipment Status */}
            {equipment?.equipment_status && (
              <div>
                <h3 className="font-semibold mb-2">Status</h3>
                {(() => {
                  const statusOpt = EQUIPMENT_STATUS_OPTIONS.find(s => s.value === equipment.equipment_status);
                  return (
                    <Badge className={statusOpt?.color || 'bg-gray-500'}>
                      {statusOpt?.label || equipment.equipment_status}
                    </Badge>
                  );
                })()}
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-3">📍 Localização</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>🏢 {equipment?.rack?.room?.floor?.building?.name}</p>
                <p>📶 {equipment?.rack?.room?.floor?.name}</p>
                <p>🚪 {equipment?.rack?.room?.name}</p>
                <p>📦 {equipment?.rack?.name}</p>
                <p className="font-medium text-foreground">
                  Posição: U{equipment?.position_u_start}-{equipment?.position_u_end}
                  ({(equipment?.position_u_end || 0) - (equipment?.position_u_start || 0) + 1}U)
                </p>
              </div>
            </div>

            {/* Network Info - Only show if equipment has network capabilities */}
            {(() => {
              const fieldConfig = getEquipmentFieldConfig(equipment?.type || '');
              if (!fieldConfig.hasNetwork) return null;
              if (!equipment?.ip_address && !equipment?.hostname && !equipment?.primary_mac_address) return null;
              
              return (
                <div>
                  <h3 className="font-semibold mb-3">🌐 Rede</h3>
                  <div className="space-y-1 text-sm">
                    {equipment?.ip_address && (
                      <p className="text-muted-foreground">IP: <span className="font-mono">{equipment.ip_address}</span></p>
                    )}
                    {equipment?.hostname && (
                      <p className="text-muted-foreground">Host: <span className="font-mono">{equipment.hostname}</span></p>
                    )}
                    {equipment?.primary_mac_address && (
                      <p className="text-muted-foreground">MAC: <span className="font-mono">{equipment.primary_mac_address}</span></p>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Asset Tag */}
            {equipment?.asset_tag && (
              <div>
                <h3 className="font-semibold mb-2">🏷️ Patrimônio</h3>
                <p className="text-sm font-mono">{equipment.asset_tag}</p>
              </div>
            )}

            {/* Physical Specs */}
            {(equipment?.power_consumption_watts || equipment?.weight_kg || equipment?.airflow) && (
              <div>
                <h3 className="font-semibold mb-3">⚡ Especificações</h3>
                <div className="space-y-1 text-sm">
                  {equipment?.power_consumption_watts && (
                    <p className="text-muted-foreground">Consumo: {equipment.power_consumption_watts}W</p>
                  )}
                  {equipment?.weight_kg && (
                    <p className="text-muted-foreground">Peso: {equipment.weight_kg}kg</p>
                  )}
                  {equipment?.airflow && (
                    <p className="text-muted-foreground">
                      Airflow: {AIRFLOW_OPTIONS.find(a => a.value === equipment.airflow)?.label || equipment.airflow}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Port Statistics - Only show if equipment has ports */}
            {stats.total > 0 && (
              <div>
                <h3 className="font-semibold mb-3">📊 Estatísticas de Portas</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-medium">{stats.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">🟢 Disponíveis:</span>
                    <span className="font-medium">{stats.available} ({stats.total > 0 ? Math.round(stats.available / stats.total * 100) : 0}%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">🔴 Em Uso:</span>
                    <span className="font-medium">{stats.inUse} ({stats.total > 0 ? Math.round(stats.inUse / stats.total * 100) : 0}%)</span>
                  </div>
                  {stats.reserved > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">🟡 Reservadas:</span>
                      <span className="font-medium">{stats.reserved}</span>
                    </div>
                  )}
                  {stats.faulty > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">⚫ Defeituosas:</span>
                      <span className="font-medium">{stats.faulty}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PoE Budget Indicator */}
            {poePowerData && (
              <PoeBudgetIndicator
                budgetWatts={poePowerData.budgetWatts}
                usedWatts={poePowerData.usedWatts}
                activePorts={poePowerData.activePorts}
                totalPorts={poePowerData.totalPorts}
                powerPerPort={poePowerData.powerPerPort}
              />
            )}

            {/* Zabbix Alerts Section */}
            <ZabbixAlertsSection equipmentId={id!} />
          </Card>

          <div className="md:col-span-3 space-y-4">
            {/* Camera Location Card - only for IP Cameras */}
            {equipment?.type === 'ip_camera' && (() => {
              const notes = parseEquipmentNotes(equipment.notes);
              const locationPhotoUrl = extractLocationPhotoUrl(notes);
              const locationDescription = extractLocationDescription(notes);
              const liveUrl = extractLiveUrl(notes);
              
              return (
                <Card className="p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Localização da Câmera
                  </h2>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    {locationPhotoUrl && (
                      <div className="relative group">
                        <img
                          src={locationPhotoUrl}
                          alt="Localização da câmera"
                          className="w-full h-48 object-cover rounded-lg border cursor-pointer"
                          onClick={() => setImageZoomOpen(true)}
                        />
                        <div 
                          className="absolute inset-0 flex items-center justify-center bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg cursor-pointer"
                          onClick={() => setImageZoomOpen(true)}
                        >
                          <ZoomIn className="w-8 h-8" />
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      {locationDescription && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Descrição do Local</p>
                          <p className="text-sm">{locationDescription}</p>
                        </div>
                      )}
                      
                      <div className="flex flex-col gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/cameras/map?search=${encodeURIComponent(equipment.name)}`)}
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          Abrir no Mapa de Câmeras
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setAccessConfigDialogOpen(true)}
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Configurar Acesso ao Vivo
                        </Button>
                        
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => setLiveDialogOpen(true)}
                          disabled={!liveUrl}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Visualizar Câmera ao Vivo
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })()}

            {/* NVR Topology Diagram - for NVR/DVR equipment */}
            {(equipment?.type === 'nvr' || (equipment?.type as string) === 'nvr_poe' || equipment?.type === 'dvr') && (
              <NvrTopologyDiagram equipmentId={equipment.id} />
            )}

            {/* NVR Channel Grid - for NVR/DVR equipment */}
            {(equipment?.type === 'nvr' || (equipment?.type as string) === 'nvr_poe' || equipment?.type === 'dvr') && (
              <NvrChannelGrid 
                notes={equipment.notes}
                ports={equipment.ports}
                defaultTotalChannels={equipment.type === 'dvr' ? 8 : 16}
                isNvrPoe={(equipment?.type as string) === 'nvr_poe'}
                onPlanCamera={(channel) => {
                  setSelectedChannel(channel);
                  setPlanCameraDialogOpen(true);
                }}
              />
            )}

            {/* Location Gallery */}
            {equipment?.ports && equipment.ports.length > 0 && (
              <LocationGallery ports={equipment.ports} />
            )}

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                Portas do Equipamento ({filteredPorts.length})
              </h2>

              <div className="space-y-4 mb-4">
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Tipo de Porta</label>
                    <Select value={portTypeFilter} onValueChange={setPortTypeFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os tipos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os tipos</SelectItem>
                        {PORT_TYPE_CATEGORIES.map(cat => (
                          <div key={cat.id}>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                              {cat.label}
                            </div>
                            {PORT_TYPES.filter(pt => pt.category === cat.id).map(pt => (
                              <SelectItem key={pt.value} value={pt.value}>
                                <div className="flex items-center gap-2">
                                  <pt.icon className="w-3 h-3" />
                                  {pt.label}
                                </div>
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-1 block">Velocidade</label>
                    <Select value={speedFilter} onValueChange={setSpeedFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {availableSpeeds.map(speed => (
                          <SelectItem key={speed} value={speed}>{speed}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-1 block">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="available">Disponíveis</SelectItem>
                        <SelectItem value="in_use">Em Uso</SelectItem>
                        <SelectItem value="reserved">Reservadas</SelectItem>
                        <SelectItem value="disabled">Desabilitadas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-1 block">Buscar</label>
                    <Input
                      placeholder="Nome da porta..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Porta</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Velocidade</TableHead>
                    <TableHead>Conexão</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPorts.map((port: any) => {
                    const portType = PORT_TYPES.find(pt => pt.value === port.port_type);
                    const PortIcon = portType?.icon;
                    const portNotes = parseEquipmentNotes(port.notes);
                    const hasLocationPhoto = !!extractLocationPhotoUrl(portNotes);
                    return (
                      <TableRow key={port.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {port.name}
                            {hasLocationPhoto && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Camera className="w-4 h-4 text-green-500 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Foto de localização salva</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {PortIcon && <PortIcon className="w-4 h-4 text-muted-foreground" />}
                            <span className="text-sm text-muted-foreground">
                              {getPortTypeLabel(port.port_type)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(port.status)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {port.speed || '-'}
                        </TableCell>
                      <TableCell>
                        {port.connection ? (
                          <Button
                            variant="link"
                            className="p-0 h-auto"
                            onClick={() => navigate(`/connections/${port.connection.id}`)}
                          >
                            {port.connection.connection_code}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedPortId(port.id);
                              setPortDialogOpen(true);
                            }}>Editar Porta</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedPortIdForLocation(port.id);
                              setLocationDialogOpen(true);
                            }}>
                              <MapPin className="w-4 h-4 mr-2" />
                              Ver Localização
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedPortIdForStatus(port.id);
                              setStatusDialogOpen(true);
                            }}>Alterar Status</DropdownMenuItem>
                            {port.status === 'in_use' && port.connection && (
                              <DropdownMenuItem
                                onClick={() => navigate(`/connections/${port.connection.id}`)}
                              >
                                Ver Conexão
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    ◀ Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Próxima ▶
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>

        <PortManageDialog
          open={portDialogOpen}
          onOpenChange={setPortDialogOpen}
          equipmentId={id!}
          port={selectedPort}
        />
        
        {equipment && (
          <EquipmentEditDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            equipment={equipment}
            onSave={handleUpdateEquipment}
            isLoading={isUpdating}
          />
        )}
        
        {/* Plan Camera Dialog for NVR/DVR */}
        {(equipment?.type === 'nvr' || equipment?.type === 'dvr') && (
          <PlanCameraDialog
            open={planCameraDialogOpen}
            onOpenChange={setPlanCameraDialogOpen}
            nvrId={id!}
            nvrName={equipment.name}
            channel={selectedChannel}
          />
        )}

        {/* Port Location Dialog */}
        <PortLocationDialog
          open={locationDialogOpen}
          onOpenChange={setLocationDialogOpen}
          port={selectedPortForLocation}
        />

        {/* Camera Location Image Zoom Dialog */}
        {equipment?.type === 'ip_camera' && (() => {
          const notes = parseEquipmentNotes(equipment.notes);
          const locationPhotoUrl = extractLocationPhotoUrl(notes);
          if (!locationPhotoUrl) return null;
          
          return (
            <Dialog open={imageZoomOpen} onOpenChange={setImageZoomOpen}>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Localização de {equipment.name}
                  </DialogTitle>
                </DialogHeader>
                <img
                  src={locationPhotoUrl}
                  alt="Localização da câmera"
                  className="w-full max-h-[70vh] object-contain rounded-lg"
                />
              </DialogContent>
            </Dialog>
          );
        })()}

        {/* Orphan Images Cleanup Dialog */}
        <OrphanImagesCleanup
          open={orphanCleanupOpen}
          onOpenChange={setOrphanCleanupOpen}
        />

        {/* Port Status Dialog */}
        <PortStatusDialog
          open={statusDialogOpen}
          onOpenChange={setStatusDialogOpen}
          port={selectedPortForStatus}
          onStatusChange={handleStatusChange}
          equipmentType={equipment?.type}
        />

        {/* Camera Live Dialog */}
        {equipment?.type === 'ip_camera' && (() => {
          const notes = parseEquipmentNotes(equipment.notes);
          const liveUrl = extractLiveUrl(notes);
          if (!liveUrl) return null;
          
          return (
            <CameraLiveDialog
              open={liveDialogOpen}
              onOpenChange={setLiveDialogOpen}
              cameraName={equipment.name}
              streamUrl={liveUrl}
            />
          );
        })()}

        {/* Camera Access Config Dialog */}
        {equipment?.type === 'ip_camera' && (
          <CameraAccessConfigDialog
            open={accessConfigDialogOpen}
            onOpenChange={setAccessConfigDialogOpen}
            cameraName={equipment.name}
            currentUrl={extractLiveUrl(parseEquipmentNotes(equipment.notes))}
            onSave={(url, config) => {
              // Update equipment notes with new live_url
              const currentNotes = parseEquipmentNotes(equipment.notes);
              const updatedNotes = {
                ...currentNotes,
                live_url: url,
                stream_config: config,
              };
              
              updateEquipment({
                id: id!,
                notes: JSON.stringify(updatedNotes),
              });
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}
