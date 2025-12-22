import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Camera, Plus, Hash, Server } from 'lucide-react';
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

interface NvrChannelGridProps {
  notes: string | null;
  onPlanCamera?: (channel: number) => void;
}

export function NvrChannelGrid({ notes, onPlanCamera }: NvrChannelGridProps) {
  const parseNotes = (notesStr: string | null): NvrNotesData => {
    if (!notesStr) return {};
    try {
      return typeof notesStr === 'string' ? JSON.parse(notesStr) : notesStr;
    } catch {
      return {};
    }
  };

  const nvrData = parseNotes(notes);
  const totalChannels = nvrData.totalChannels || 16;
  const usedChannels = nvrData.usedChannels || [];
  const vacantChannels = nvrData.vacantChannels || [];
  const cameras = nvrData.cameras || [];

  // Generate all channels
  const channels = Array.from({ length: totalChannels }, (_, i) => {
    const channelNum = i + 1;
    const isOccupied = usedChannels.includes(channelNum);
    const camera = cameras.find(c => c.channel === channelNum);
    
    return {
      number: channelNum,
      isOccupied,
      camera
    };
  });

  const stats = {
    total: totalChannels,
    occupied: usedChannels.length,
    vacant: vacantChannels.length || (totalChannels - usedChannels.length)
  };

  if (!nvrData.totalChannels && !nvrData.cameras?.length) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Server className="w-4 h-4" />
            Canais do NVR
          </span>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
              {stats.occupied} ocupados
            </Badge>
            <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">
              {stats.vacant} vagos
            </Badge>
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
                      channel.isOccupied
                        ? "bg-green-500/10 border-green-500/30 text-green-700 hover:bg-green-500/20"
                        : "bg-orange-500/10 border-orange-500/30 text-orange-700 hover:bg-orange-500/20"
                    )}
                    onClick={() => !channel.isOccupied && onPlanCamera?.(channel.number)}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      {channel.isOccupied ? (
                        <Camera className="w-3.5 h-3.5" />
                      ) : (
                        <Hash className="w-3.5 h-3.5" />
                      )}
                      <span>CH{channel.number}</span>
                    </div>
                    {!channel.isOccupied && onPlanCamera && (
                      <Plus className="absolute -top-1 -right-1 w-3 h-3 text-orange-600" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-sm">
                    <p className="font-medium">Canal {channel.number}</p>
                    {channel.isOccupied && channel.camera ? (
                      <>
                        <p className="text-muted-foreground">IP: {channel.camera.ip}</p>
                        <p className="text-muted-foreground">{channel.camera.location}</p>
                      </>
                    ) : (
                      <p className="text-orange-600">Canal disponível</p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 rounded bg-green-500/20 border-2 border-green-500/30" />
            <span className="text-muted-foreground">Ocupado</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 rounded bg-orange-500/20 border-2 border-orange-500/30" />
            <span className="text-muted-foreground">Vago</span>
          </div>
        </div>

        {/* Plan Camera Button */}
        {stats.vacant > 0 && onPlanCamera && (
          <div className="mt-4 pt-4 border-t">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                const firstVacant = channels.find(c => !c.isOccupied);
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
