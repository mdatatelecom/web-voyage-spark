import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Eye, EyeOff, Play, Square, Wind, Flame, StickyNote, Plus, 
  RotateCcw, Camera, Move, Maximize2, Minimize2, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface Rack3DToolbarProps {
  xrayMode: boolean;
  onXrayToggle: () => void;
  tourActive: boolean;
  onTourToggle: () => void;
  tourDisabled: boolean;
  airflowMode: 'off' | 'flow' | 'thermal' | 'both';
  onAirflowChange: (mode: 'off' | 'flow' | 'thermal' | 'both') => void;
  showAnnotations: boolean;
  onAnnotationsToggle: () => void;
  onNewAnnotation: () => void;
  onCameraPreset: (preset: 'front' | 'rear' | 'left' | 'right' | 'top' | 'iso') => void;
  onResetCamera: () => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  panelOpen: boolean;
  onPanelToggle: () => void;
  isFullscreen?: boolean;
  onFullscreenToggle?: () => void;
}

export function Rack3DToolbar({
  xrayMode,
  onXrayToggle,
  tourActive,
  onTourToggle,
  tourDisabled,
  airflowMode,
  onAirflowChange,
  showAnnotations,
  onAnnotationsToggle,
  onNewAnnotation,
  onCameraPreset,
  onResetCamera,
  zoom,
  onZoomChange,
  panelOpen,
  onPanelToggle,
  isFullscreen = false,
  onFullscreenToggle,
}: Rack3DToolbarProps) {
  return (
    <div className="flex items-center gap-1 p-2 bg-background/95 backdrop-blur border-t rounded-b-lg">
      {/* Visualization Group */}
      <div className="flex items-center gap-1 pr-2 border-r">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={xrayMode ? 'default' : 'ghost'}
              size="sm"
              onClick={onXrayToggle}
              className="h-8"
            >
              {xrayMode ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Modo Raio-X</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={tourActive ? 'destructive' : 'ghost'}
              size="sm"
              onClick={onTourToggle}
              disabled={tourDisabled}
              className="h-8"
            >
              {tourActive ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{tourActive ? 'Parar Tour' : 'Iniciar Tour'}</TooltipContent>
        </Tooltip>
      </div>

      {/* Simulation Group */}
      <div className="flex items-center gap-1 px-2 border-r">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={airflowMode === 'flow' || airflowMode === 'both' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onAirflowChange(airflowMode === 'flow' ? 'off' : airflowMode === 'both' ? 'thermal' : airflowMode === 'thermal' ? 'both' : 'flow')}
              className="h-8"
            >
              <Wind className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Fluxo de Ar</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={airflowMode === 'thermal' || airflowMode === 'both' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onAirflowChange(airflowMode === 'thermal' ? 'off' : airflowMode === 'both' ? 'flow' : airflowMode === 'flow' ? 'both' : 'thermal')}
              className="h-8"
            >
              <Flame className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Mapa Térmico</TooltipContent>
        </Tooltip>
      </div>

      {/* Annotations Group */}
      <div className="flex items-center gap-1 px-2 border-r">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={showAnnotations ? 'default' : 'ghost'}
              size="sm"
              onClick={onAnnotationsToggle}
              className="h-8"
            >
              <StickyNote className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{showAnnotations ? 'Ocultar Anotações' : 'Mostrar Anotações'}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onNewAnnotation}
              className="h-8"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Nova Anotação</TooltipContent>
        </Tooltip>
      </div>

      {/* Camera Presets */}
      <div className="flex items-center gap-1 px-2 border-r">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => onCameraPreset('front')} className="h-8 text-xs px-2">
              F
            </Button>
          </TooltipTrigger>
          <TooltipContent>Vista Frontal</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => onCameraPreset('rear')} className="h-8 text-xs px-2">
              T
            </Button>
          </TooltipTrigger>
          <TooltipContent>Vista Traseira</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => onCameraPreset('left')} className="h-8 text-xs px-2">
              E
            </Button>
          </TooltipTrigger>
          <TooltipContent>Vista Esquerda</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => onCameraPreset('right')} className="h-8 text-xs px-2">
              D
            </Button>
          </TooltipTrigger>
          <TooltipContent>Vista Direita</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={() => onCameraPreset('iso')} className="h-8 text-xs px-2">
              <Camera className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Vista Isométrica</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={onResetCamera} className="h-8">
              <RotateCcw className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Resetar Câmera</TooltipContent>
        </Tooltip>
      </div>

      {/* Zoom Slider */}
      <div className="flex items-center gap-2 px-2 border-r min-w-[150px]">
        <Move className="w-4 h-4 text-muted-foreground" />
        <Slider
          value={[zoom]}
          onValueChange={([value]) => onZoomChange(value)}
          min={0.5}
          max={3}
          step={0.1}
          className="flex-1"
        />
        <span className="text-xs text-muted-foreground w-8">{zoom.toFixed(1)}x</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Fullscreen Toggle */}
      {onFullscreenToggle && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isFullscreen ? 'default' : 'ghost'}
              size="sm"
              onClick={onFullscreenToggle}
              className="h-8"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isFullscreen ? 'Sair Tela Cheia (ESC/F11)' : 'Tela Cheia (F11)'}
          </TooltipContent>
        </Tooltip>
      )}

      {/* Panel Toggle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onPanelToggle}
            className="h-8"
          >
            {panelOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{panelOpen ? 'Ocultar Painel' : 'Mostrar Painel'}</TooltipContent>
      </Tooltip>
    </div>
  );
}
