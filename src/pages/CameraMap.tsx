import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Camera, MapPin, Building2, Layers, DoorOpen, Search, Eye, WifiOff, AlertTriangle, CheckCircle, Clock, X } from 'lucide-react';
import { useBuildings } from '@/hooks/useBuildings';
import { useFloors } from '@/hooks/useFloors';
import { useCameras, type CameraData } from '@/hooks/useCameras';
import { getConnectionTypeLabel } from '@/constants/cameraSpecs';

const STATUS_CONFIG = {
  active: { label: 'Online', color: 'bg-green-500', icon: CheckCircle, textColor: 'text-green-600' },
  offline: { label: 'Offline', color: 'bg-red-500', icon: WifiOff, textColor: 'text-red-600' },
  planned: { label: 'Planejada', color: 'bg-gray-400', icon: Clock, textColor: 'text-gray-500' },
  failed: { label: 'Falha', color: 'bg-red-600', icon: AlertTriangle, textColor: 'text-red-600' },
  staged: { label: 'Manutenção', color: 'bg-yellow-500', icon: AlertTriangle, textColor: 'text-yellow-600' },
};

export default function CameraMap() {
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [selectedFloorId, setSelectedFloorId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCamera, setSelectedCamera] = useState<CameraData | null>(null);
  
  const { buildings } = useBuildings();
  const { floors } = useFloors(selectedBuildingId);
  const { data: cameras, isLoading } = useCameras(selectedBuildingId, selectedFloorId);
  
  // Filter cameras by search term
  const filteredCameras = cameras?.filter(cam =>
    cam.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cam.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cam.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];
  
  // Group cameras by room
  const camerasByRoom = filteredCameras.reduce((acc, cam) => {
    const roomId = cam.rack.room.id;
    if (!acc[roomId]) {
      acc[roomId] = {
        room: cam.rack.room,
        cameras: [],
      };
    }
    acc[roomId].cameras.push(cam);
    return acc;
  }, {} as Record<string, { room: CameraData['rack']['room']; cameras: CameraData[] }>);
  
  // Stats
  const stats = {
    total: filteredCameras.length,
    online: filteredCameras.filter(c => c.equipment_status === 'active').length,
    offline: filteredCameras.filter(c => c.equipment_status === 'offline' || c.equipment_status === 'failed').length,
    maintenance: filteredCameras.filter(c => c.equipment_status === 'staged').length,
  };
  
  const getStatusConfig = (status: string | null) => {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.planned;
  };
  
  const parseNotes = (notes: string | null) => {
    if (!notes) return {};
    try {
      return typeof notes === 'string' ? JSON.parse(notes) : notes;
    } catch {
      return {};
    }
  };
  
  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Camera className="w-6 h-6" />
              Mapa de Câmeras
            </h1>
            <p className="text-muted-foreground">Visualização de câmeras por localização</p>
          </div>
          
          {/* Stats */}
          <div className="flex gap-3">
            <Badge variant="outline" className="gap-1 px-3 py-1">
              <Camera className="w-4 h-4" />
              {stats.total} Total
            </Badge>
            <Badge variant="outline" className="gap-1 px-3 py-1 bg-green-500/10 text-green-600 border-green-500/30">
              <CheckCircle className="w-4 h-4" />
              {stats.online} Online
            </Badge>
            {stats.offline > 0 && (
              <Badge variant="outline" className="gap-1 px-3 py-1 bg-red-500/10 text-red-600 border-red-500/30">
                <WifiOff className="w-4 h-4" />
                {stats.offline} Offline
              </Badge>
            )}
          </div>
        </div>
        
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar câmera..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={selectedBuildingId} onValueChange={(v) => {
                setSelectedBuildingId(v);
                setSelectedFloorId('');
              }}>
                <SelectTrigger>
                  <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Todos os prédios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os prédios</SelectItem>
                  {buildings?.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select 
                value={selectedFloorId} 
                onValueChange={setSelectedFloorId}
                disabled={!selectedBuildingId}
              >
                <SelectTrigger>
                  <Layers className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Todos os andares" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os andares</SelectItem>
                  {floors?.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedBuildingId('');
                  setSelectedFloorId('');
                  setSearchTerm('');
                }}
              >
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Camera Grid by Room */}
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : Object.keys(camerasByRoom).length === 0 ? (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                <Camera className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Nenhuma câmera encontrada</p>
                <p className="text-sm">Adicione câmeras através da página de Equipamentos</p>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4">
              {Object.values(camerasByRoom).map(({ room, cameras: roomCameras }) => (
                <Card key={room.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <DoorOpen className="w-4 h-4 text-muted-foreground" />
                      {room.name}
                      <span className="text-muted-foreground font-normal text-sm">
                        • {room.floor.name} • {room.floor.building.name}
                      </span>
                      <Badge variant="secondary" className="ml-auto">
                        {roomCameras.length} câmera{roomCameras.length !== 1 ? 's' : ''}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {roomCameras.map(camera => {
                        const statusConfig = getStatusConfig(camera.equipment_status);
                        const StatusIcon = statusConfig.icon;
                        const notes = parseNotes(camera.notes);
                        
                        return (
                          <button
                            key={camera.id}
                            onClick={() => setSelectedCamera(camera)}
                            className="group relative flex flex-col items-center p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left"
                          >
                            {/* Status indicator */}
                            <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${statusConfig.color} animate-pulse`} />
                            
                            {/* Camera icon or photo */}
                            {camera.location_photo_url ? (
                              <div className="w-16 h-16 rounded-lg overflow-hidden mb-2 bg-muted">
                                <img 
                                  src={camera.location_photo_url} 
                                  alt={camera.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-16 h-16 rounded-lg bg-muted flex flex-col items-center justify-center mb-2">
                                <Camera className="w-6 h-6 text-muted-foreground" />
                                <span className="text-[8px] text-muted-foreground mt-1">Sem foto</span>
                              </div>
                            )}
                            
                            {/* Name */}
                            <p className="font-medium text-xs text-center line-clamp-2">{camera.name}</p>
                            
                            {/* Status */}
                            <div className={`flex items-center gap-1 mt-1 text-xs ${statusConfig.textColor}`}>
                              <StatusIcon className="w-3 h-3" />
                              {statusConfig.label}
                            </div>
                            
                            {/* Connection type badge */}
                            <Badge variant="outline" className="mt-1 text-[10px] px-1.5 py-0">
                              {getConnectionTypeLabel(camera.connection_type || 'ip')}
                            </Badge>
                            
                            {/* Hover overlay */}
                            <div className="absolute inset-0 flex items-center justify-center bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                              <Eye className="w-5 h-5" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {/* Camera Detail Modal */}
        <Dialog open={!!selectedCamera} onOpenChange={() => setSelectedCamera(null)}>
          <DialogContent className="max-w-lg">
            {selectedCamera && (() => {
              const statusConfig = getStatusConfig(selectedCamera.equipment_status);
              const StatusIcon = statusConfig.icon;
              const notes = parseNotes(selectedCamera.notes);
              
              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Camera className="w-5 h-5" />
                      {selectedCamera.name}
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    {/* Photo */}
                    {selectedCamera.location_photo_url && (
                      <div className="rounded-lg overflow-hidden bg-muted aspect-video">
                        <img 
                          src={selectedCamera.location_photo_url} 
                          alt={`Localização de ${selectedCamera.name}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    
                    {/* Status */}
                    <div className={`flex items-center gap-2 p-3 rounded-lg ${
                      selectedCamera.equipment_status === 'active' ? 'bg-green-500/10' : 
                      selectedCamera.equipment_status === 'offline' ? 'bg-red-500/10' : 'bg-muted'
                    }`}>
                      <div className={`w-3 h-3 rounded-full ${statusConfig.color}`} />
                      <StatusIcon className={`w-4 h-4 ${statusConfig.textColor}`} />
                      <span className={`font-medium ${statusConfig.textColor}`}>{statusConfig.label}</span>
                    </div>
                    
                    {/* Info grid */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Fabricante</p>
                        <p className="font-medium">{selectedCamera.manufacturer || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Modelo</p>
                        <p className="font-medium">{selectedCamera.model || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Tipo de Conexão</p>
                        <p className="font-medium">{getConnectionTypeLabel(selectedCamera.connection_type || 'ip')}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Resolução</p>
                        <p className="font-medium">{notes.resolution?.toUpperCase() || '-'}</p>
                      </div>
                    </div>
                    
                    {/* Location */}
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-muted">
                      <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      <div className="text-sm">
                        <p className="font-medium">{selectedCamera.rack.room.name}</p>
                        <p className="text-muted-foreground">
                          {selectedCamera.rack.room.floor.name} • {selectedCamera.rack.room.floor.building.name}
                        </p>
                        {notes.locationDescription && (
                          <p className="text-muted-foreground mt-1">{notes.locationDescription}</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Camera specs */}
                    {(notes.hasIR || notes.hasAudio || notes.hasSD) && (
                      <div className="flex flex-wrap gap-2">
                        {notes.hasIR && (
                          <Badge variant="outline">IR {notes.irRange}m</Badge>
                        )}
                        {notes.hasAudio && (
                          <Badge variant="outline">Áudio</Badge>
                        )}
                        {notes.hasSD && (
                          <Badge variant="outline">SD Card</Badge>
                        )}
                        {notes.codec && (
                          <Badge variant="outline">{notes.codec.toUpperCase()}</Badge>
                        )}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
