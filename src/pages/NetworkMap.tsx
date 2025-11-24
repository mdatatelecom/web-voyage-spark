import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ForceGraph2D from 'react-force-graph-2d';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ZoomIn, ZoomOut, Maximize, Download } from 'lucide-react';
import { useNetworkGraph } from '@/hooks/useNetworkGraph';
import { useBuildings } from '@/hooks/useBuildings';
import { EQUIPMENT_CATEGORIES } from '@/constants/equipmentTypes';

// Color definitions
const EQUIPMENT_COLORS: Record<string, string> = {
  switch: '#3b82f6',
  router: '#8b5cf6',
  server: '#10b981',
  firewall: '#ef4444',
  patch_panel: '#f59e0b',
  patch_panel_fiber: '#f97316',
  storage: '#06b6d4',
  load_balancer: '#ec4899',
  waf: '#f43f5e',
  access_point: '#14b8a6',
  pdu: '#a3e635',
  ups: '#84cc16',
  dvr: '#fb923c',
  nvr: '#f87171',
  pabx: '#c084fc',
  voip_gateway: '#a78bfa',
  modem: '#60a5fa',
  olt: '#fbbf24',
  onu: '#fcd34d',
  kvm: '#94a3b8',
  console_server: '#64748b',
  other: '#6b7280'
};

const CABLE_COLORS: Record<string, string> = {
  utp_cat5e: '#94a3b8',
  utp_cat6: '#64748b',
  utp_cat6a: '#475569',
  fiber_om3: '#f97316',
  fiber_om4: '#ea580c',
  fiber_os2: '#dc2626',
  dac: '#22d3ee',
  other: '#9ca3af'
};

export default function NetworkMap() {
  const navigate = useNavigate();
  const graphRef = useRef<any>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [buildingFilter, setBuildingFilter] = useState<string>('all');
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [zoomLevel, setZoomLevel] = useState(1);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  
  const { graphData, isLoading } = useNetworkGraph(
    buildingFilter === 'all' ? undefined : buildingFilter,
    selectedTypes.size > 0 ? selectedTypes : undefined
  );
  const { buildings } = useBuildings();
  
  // Get all unique equipment types from graphData
  const availableTypes = Array.from(new Set(graphData.nodes.map(n => n.type)));
  
  // Responsive dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width,
          height: Math.max(600, window.innerHeight - 300)
        });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const toggleType = useCallback((type: string) => {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);
  
  const clearTypeFilter = useCallback(() => {
    setSelectedTypes(new Set());
  }, []);

  const handleZoomChange = useCallback((value: number) => {
    setZoomLevel(value);
    if (graphRef.current) {
      graphRef.current.zoom(value, 400);
    }
  }, []);

  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(5, zoomLevel * 1.2);
    handleZoomChange(newZoom);
  }, [zoomLevel, handleZoomChange]);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(0.1, zoomLevel * 0.8);
    handleZoomChange(newZoom);
  }, [zoomLevel, handleZoomChange]);

  const handleFitView = useCallback(() => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400, 50);
    }
  }, []);

  const handleExport = useCallback(() => {
    if (graphRef.current) {
      const canvas = graphRef.current.renderer().domElement;
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `network-map-${new Date().toISOString()}.png`;
      link.href = url;
      link.click();
    }
  }, []);

  const handleNodeClick = useCallback((node: any) => {
    navigate(`/equipment/${node.id}`);
  }, [navigate]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Mapa da Rede</h1>
            <p className="text-muted-foreground mt-1">
              Visualização automática da topologia de rede
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={handleZoomOut}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleZoomIn}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleFitView}>
              <Maximize className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleExport}>
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex gap-4">
          <div className="w-64">
            <label className="text-sm font-medium mb-2 block">Filtrar por Prédio</label>
            <Select value={buildingFilter} onValueChange={setBuildingFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os prédios</SelectItem>
                {buildings?.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Controle de Zoom</label>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground w-12">{Math.round(zoomLevel * 100)}%</span>
              <Slider
                value={[zoomLevel]}
                onValueChange={([val]) => handleZoomChange(val)}
                min={0.1}
                max={5}
                step={0.1}
                className="flex-1"
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Carregando mapa da rede...</p>
          </Card>
        ) : (
          <div className="grid grid-cols-[1fr_300px] gap-6">
            <Card className="p-4" ref={containerRef}>
              <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                nodeLabel="name"
                nodeAutoColorBy="type"
                width={dimensions.width}
                height={dimensions.height}
                nodeColor={(node: any) => EQUIPMENT_COLORS[node.type] || EQUIPMENT_COLORS.other}
                nodeRelSize={6}
                nodeCanvasObject={(node: any, ctx, globalScale) => {
                  const label = node.name;
                  const fontSize = 12 / globalScale;
                  ctx.font = `${fontSize}px Sans-Serif`;
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                  ctx.fillText(label, node.x, node.y + 15 / globalScale);
                }}
                linkLabel={(link: any) => `
                  <div style="background: white; padding: 6px; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <strong>${link.connectionCode}</strong><br/>
                    Cabo: ${link.cableType}<br/>
                    Status: ${link.status}
                  </div>
                `}
                linkColor={(link: any) => CABLE_COLORS[link.cableType] || CABLE_COLORS.other}
                linkWidth={2}
                linkDirectionalParticles={2}
                linkDirectionalParticleWidth={2}
                onNodeClick={handleNodeClick}
                cooldownTicks={100}
                d3VelocityDecay={0.3}
              />
            </Card>
            
            <Card className="p-6 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">🎨 Filtrar por Tipo</h3>
                  {selectedTypes.size > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearTypeFilter}>
                      Mostrar Todos
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {EQUIPMENT_CATEGORIES.flatMap(cat => cat.types)
                    .filter(type => availableTypes.includes(type.value))
                    .map(type => {
                      const color = EQUIPMENT_COLORS[type.value] || '#999';
                      const isSelected = selectedTypes.size === 0 || selectedTypes.has(type.value);
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.value}
                          onClick={() => toggleType(type.value)}
                          className={`w-full flex items-center gap-2 p-2 rounded-md transition-all ${
                            isSelected 
                              ? 'bg-primary/10 hover:bg-primary/20' 
                              : 'opacity-40 hover:opacity-60'
                          }`}
                        >
                          <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm flex-1 text-left">{type.label}</span>
                          <Badge variant="secondary" className="text-xs">
                            {graphData.nodes.filter(n => n.type === type.value).length}
                          </Badge>
                        </button>
                      );
                    })}
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-4">🔗 Legenda - Cabos</h3>
                <div className="space-y-2">
                  {Object.entries(CABLE_COLORS).map(([type, color]) => (
                    <div key={type} className="flex items-center gap-2 text-sm">
                      <div className="w-8 h-0.5" style={{ backgroundColor: color }} />
                      <span className="capitalize">{type.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  💡 Dica: Clique em um tipo para filtrar. Clique em um equipamento para ver detalhes. Arraste para mover.
                </p>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
