import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNvrTopology } from '@/hooks/useNvrTopology';
import { 
  Network, 
  Server, 
  Camera, 
  ArrowRight, 
  ArrowDown,
  Zap,
  Globe,
  Video,
  HardDrive,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface NvrTopologyDiagramProps {
  equipmentId: string;
}

export function NvrTopologyDiagram({ equipmentId }: NvrTopologyDiagramProps) {
  const { data: topology, isLoading } = useNvrTopology(equipmentId);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!topology) {
    return null;
  }

  const isNvrPoe = topology.nvrType === 'nvr_poe';
  const isDvr = topology.nvrType === 'dvr';

  // Get equipment type label
  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'switch': 'Switch',
      'switch_poe': 'Switch PoE',
      'router': 'Roteador',
      'firewall': 'Firewall',
      'server': 'Servidor',
      'nvr': 'NVR',
      'nvr_poe': 'NVR PoE',
      'dvr': 'DVR'
    };
    return labels[type] || type;
  };

  // Group cameras by channel range for display
  const channelsPerRow = 8;
  const channelRows: number[][] = [];
  for (let i = 0; i < topology.totalChannels; i += channelsPerRow) {
    channelRows.push(
      Array.from({ length: Math.min(channelsPerRow, topology.totalChannels - i) }, (_, j) => i + j + 1)
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Network className="w-4 h-4" />
            Topologia de Conexões
          </span>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">
              {topology.stats.usedChannels}/{topology.totalChannels} canais
            </Badge>
            {isNvrPoe && (
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30 text-xs">
                <Zap className="w-3 h-3 mr-1" />
                {topology.stats.poePortsUsed}/{topology.poePorts} PoE
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Topology Diagram */}
        <div className="flex flex-col items-center gap-4">
          {/* Uplink Connection */}
          <div className="flex items-center gap-4">
            {topology.uplinkConnection ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-auto py-3 px-4 flex items-center gap-3"
                      onClick={() => navigate(`/equipment/${topology.uplinkConnection?.connectedEquipmentId}`)}
                    >
                      <Server className="w-6 h-6 text-blue-500" />
                      <div className="text-left">
                        <p className="font-medium text-sm">{topology.uplinkConnection.connectedEquipmentName}</p>
                        <p className="text-xs text-muted-foreground">
                          {getTypeLabel(topology.uplinkConnection.connectedEquipmentType)}
                        </p>
                      </div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Porta: {topology.uplinkConnection.portName}</p>
                    <p>Conexão: {topology.uplinkConnection.connectionCode}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <div className="h-auto py-3 px-4 border-2 border-dashed rounded-lg flex items-center gap-3 text-muted-foreground">
                <Server className="w-6 h-6" />
                <div className="text-left">
                  <p className="font-medium text-sm">Sem Conexão</p>
                  <p className="text-xs">Uplink não configurado</p>
                </div>
              </div>
            )}
            
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Uplink</span>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />

            {/* NVR Box */}
            <div className={cn(
              "py-4 px-6 rounded-lg border-2 flex items-center gap-4",
              isNvrPoe ? "bg-yellow-500/10 border-yellow-500/30" : "bg-blue-500/10 border-blue-500/30"
            )}>
              <HardDrive className={cn(
                "w-8 h-8",
                isNvrPoe ? "text-yellow-600" : "text-blue-600"
              )} />
              <div>
                <p className="font-semibold">{topology.nvrName}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {isDvr ? 'DVR' : isNvrPoe ? 'NVR PoE' : 'NVR'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {topology.totalChannels} canais
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Arrow down to channels */}
          <ArrowDown className="w-5 h-5 text-muted-foreground" />

          {/* Channel Grid */}
          <div className="w-full space-y-2">
            <p className="text-sm font-medium text-center text-muted-foreground">
              {isDvr ? 'Entradas BNC' : 'Canais de Vídeo'}
            </p>
            
            <TooltipProvider>
              <div className="flex flex-col gap-2">
                {channelRows.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex justify-center gap-2">
                    {row.map((channelNum) => {
                      const camera = topology.cameras.find(c => c.channel === channelNum);
                      const isOccupied = !!camera;
                      const isPoe = camera?.source === 'poe';
                      const isExternal = camera?.source === 'external';
                      
                      return (
                        <Tooltip key={channelNum}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "w-12 h-12 rounded-lg border-2 flex flex-col items-center justify-center cursor-pointer transition-colors",
                                isOccupied
                                  ? isPoe
                                    ? "bg-yellow-500/20 border-yellow-500/50 hover:bg-yellow-500/30"
                                    : "bg-green-500/20 border-green-500/50 hover:bg-green-500/30"
                                  : "bg-muted/30 border-muted-foreground/20 hover:border-muted-foreground/40"
                              )}
                              onClick={() => {
                                if (camera?.equipmentId) {
                                  navigate(`/equipment/${camera.equipmentId}`);
                                }
                              }}
                            >
                              {isOccupied ? (
                                <>
                                  <Camera className={cn(
                                    "w-4 h-4",
                                    isPoe ? "text-yellow-600" : "text-green-600"
                                  )} />
                                  <span className="text-[10px] font-medium">CH{channelNum}</span>
                                </>
                              ) : (
                                <>
                                  <Video className="w-4 h-4 text-muted-foreground/50" />
                                  <span className="text-[10px] text-muted-foreground">CH{channelNum}</span>
                                </>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-sm">
                              <p className="font-medium">Canal {channelNum}</p>
                              {isOccupied ? (
                                <>
                                  {camera.equipmentName && (
                                    <p className="text-muted-foreground">{camera.equipmentName}</p>
                                  )}
                                  {camera.ip && (
                                    <p className="text-muted-foreground font-mono text-xs">{camera.ip}</p>
                                  )}
                                  {camera.location && (
                                    <p className="text-muted-foreground">{camera.location}</p>
                                  )}
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "mt-1 text-xs",
                                      isPoe 
                                        ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/30"
                                        : "bg-green-500/10 text-green-600 border-green-500/30"
                                    )}
                                  >
                                    {isPoe ? (
                                      <><Zap className="w-3 h-3 mr-1" /> PoE Interno</>
                                    ) : (
                                      <><Globe className="w-3 h-3 mr-1" /> Rede Externa</>
                                    )}
                                  </Badge>
                                </>
                              ) : (
                                <p className="text-muted-foreground">Disponível</p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                ))}
              </div>
            </TooltipProvider>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 pt-4 border-t flex-wrap">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 rounded bg-green-500/20 border-2 border-green-500/50" />
            <span className="text-muted-foreground">
              <Globe className="w-3 h-3 inline mr-1" />
              Rede Externa
            </span>
          </div>
          {isNvrPoe && (
            <div className="flex items-center gap-2 text-sm">
              <div className="w-4 h-4 rounded bg-yellow-500/20 border-2 border-yellow-500/50" />
              <span className="text-muted-foreground">
                <Zap className="w-3 h-3 inline mr-1" />
                PoE Interno
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 rounded bg-muted/30 border-2 border-muted-foreground/20" />
            <span className="text-muted-foreground">Disponível</span>
          </div>
        </div>

        {/* Stats Summary */}
        {topology.stats.usedChannels > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{topology.stats.usedChannels}</p>
              <p className="text-xs text-muted-foreground">Câmeras Ativas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{topology.totalChannels - topology.stats.usedChannels}</p>
              <p className="text-xs text-muted-foreground">Canais Disponíveis</p>
            </div>
            {isNvrPoe && (
              <>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">{topology.stats.poePortsUsed}</p>
                  <p className="text-xs text-muted-foreground">Portas PoE Usadas</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{topology.stats.externalCameras}</p>
                  <p className="text-xs text-muted-foreground">Via Rede Externa</p>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
