import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Camera, Plus, Hash, Server, Ban, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CameraInfo {
  channel: number;
  ip: string;
  location: string;
  status: string;
}

interface NvrNotesData {
  totalChannels?: number;
  usedChannels?: number[];
  vacantChannels?: number[];
  cameras?: CameraInfo[];
}

interface PortData {
  id: string;
  name: string;
  port_number: number | null;
  status: string;
  notes?: string | null;
}

interface NvrChannelGridProps {
  notes: string | null;
  ports?: PortData[];
  defaultTotalChannels?: number;
  onPlanCamera?: (channel: number) => void;
}

export function NvrChannelGrid({ notes, ports, defaultTotalChannels = 16, onPlanCamera }: NvrChannelGridProps) {
  const parseNotes = (notesStr: string | null): NvrNotesData => {
    if (!notesStr) return {};
    try {
      return typeof notesStr === 'string' ? JSON.parse(notesStr) : notesStr;
    } catch {
      return {};
    }
  };

  const nvrData = parseNotes(notes);
  
  // Determine total channels: notes > max port_number > default
  const maxPortNumber = ports?.reduce((max, p) => Math.max(max, p.port_number || 0), 0) || 0;
  const totalChannels = nvrData.totalChannels || (maxPortNumber > 0 ? maxPortNumber : defaultTotalChannels);
  
  // Legacy data from notes (fallback)
  const legacyUsedChannels = nvrData.usedChannels || [];
  const cameras = nvrData.cameras || [];

  // Build channel data from ports if available, otherwise use notes
  const channels = Array.from({ length: totalChannels }, (_, i) => {
    const channelNum = i + 1;
    
    // Try to find port data for this channel
    const port = ports?.find(p => p.port_number === channelNum);
    
    let status: string = 'available';
    
    if (port) {
      // Use real port status
      status = port.status;
    } else if (legacyUsedChannels.includes(channelNum)) {
      // Fallback to legacy notes data
      status = 'in_use';
    }
    
    const camera = cameras.find(c => c.channel === channelNum);
    
    return {
      number: channelNum,
      portId: port?.id,
      status,
      camera
    };
  });

  // Calculate stats based on actual channel statuses
  const stats = {
    total: totalChannels,
    occupied: channels.filter(c => c.status === 'in_use').length,
    reserved: channels.filter(c => c.status === 'reserved').length,
    available: channels.filter(c => c.status === 'available').length,
    disabled: channels.filter(c => c.status === 'disabled' || c.status === 'faulty').length
  };

  // Don't render if no channel configuration
  if (!nvrData.totalChannels && !nvrData.cameras?.length && (!ports || ports.length === 0)) {
    return null;
  }

  const getChannelStyle = (status: string) => {
    switch (status) {
      case 'in_use':
        return 'bg-green-500/10 border-green-500/30 text-green-700 hover:bg-green-500/20';
      case 'reserved':
        return 'bg-blue-500/10 border-blue-500/30 text-blue-700 hover:bg-blue-500/20';
      case 'disabled':
      case 'faulty':
        return 'bg-slate-500/10 border-slate-500/30 text-slate-500 hover:bg-slate-500/20';
      default: // available
        return 'bg-orange-500/10 border-orange-500/30 text-orange-700 hover:bg-orange-500/20';
    }
  };

  const getChannelIcon = (status: string) => {
    switch (status) {
      case 'in_use':
        return <Camera className="w-3.5 h-3.5" />;
      case 'reserved':
        return <Camera className="w-3.5 h-3.5 opacity-50" />;
      case 'disabled':
        return <Ban className="w-3.5 h-3.5" />;
      case 'faulty':
        return <AlertTriangle className="w-3.5 h-3.5" />;
      default:
        return <Hash className="w-3.5 h-3.5" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'in_use':
        return 'Ocupado';
      case 'reserved':
        return 'Reservado';
      case 'disabled':
        return 'Desabilitado';
      case 'faulty':
        return 'Defeituoso';
      default:
        return 'Disponível';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Server className="w-4 h-4" />
            Canais do NVR
          </span>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
              {stats.occupied} ocupados
            </Badge>
            {stats.reserved > 0 && (
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                {stats.reserved} reservados
              </Badge>
            )}
            <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">
              {stats.available} vagos
            </Badge>
            {stats.disabled > 0 && (
              <Badge variant="outline" className="bg-slate-500/10 text-slate-500 border-slate-500/30">
                {stats.disabled} indisponíveis
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className={cn(
            "grid gap-2",
            totalChannels <= 16 ? "grid-cols-8" : "grid-cols-8 md:grid-cols-16"
          )}>
            {channels.map(channel => (
              <Tooltip key={channel.number}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "relative p-2 rounded-lg text-center text-xs font-medium transition-colors cursor-pointer",
                      "border-2",
                      getChannelStyle(channel.status)
                    )}
                    onClick={() => channel.status === 'available' && onPlanCamera?.(channel.number)}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      {getChannelIcon(channel.status)}
                      <span>CH{channel.number}</span>
                    </div>
                    {channel.status === 'available' && onPlanCamera && (
                      <Plus className="absolute -top-1 -right-1 w-3 h-3 text-orange-600" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-sm">
                    <p className="font-medium">Canal {channel.number}</p>
                    <p className={cn(
                      channel.status === 'in_use' ? 'text-green-600' :
                      channel.status === 'reserved' ? 'text-blue-600' :
                      channel.status === 'available' ? 'text-orange-600' :
                      'text-slate-500'
                    )}>
                      {getStatusLabel(channel.status)}
                    </p>
                    {channel.camera && (
                      <>
                        <p className="text-muted-foreground">IP: {channel.camera.ip}</p>
                        <p className="text-muted-foreground">{channel.camera.location}</p>
                      </>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t flex-wrap">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 rounded bg-green-500/20 border-2 border-green-500/30" />
            <span className="text-muted-foreground">Ocupado</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 rounded bg-blue-500/20 border-2 border-blue-500/30" />
            <span className="text-muted-foreground">Reservado</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 rounded bg-orange-500/20 border-2 border-orange-500/30" />
            <span className="text-muted-foreground">Vago</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 rounded bg-slate-500/20 border-2 border-slate-500/30" />
            <span className="text-muted-foreground">Indisponível</span>
          </div>
        </div>

        {/* Plan Camera Button */}
        {stats.available > 0 && onPlanCamera && (
          <div className="mt-4 pt-4 border-t">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                const firstVacant = channels.find(c => c.status === 'available');
                if (firstVacant) onPlanCamera(firstVacant.number);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Planejar Câmera nos Canais Vagos
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
