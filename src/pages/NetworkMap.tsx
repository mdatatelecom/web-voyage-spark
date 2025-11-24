import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ForceGraph2D from 'react-force-graph-2d';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useNetworkGraph } from '@/hooks/useNetworkGraph';
import { useBuildings } from '@/hooks/useBuildings';
import { Download, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const EQUIPMENT_COLORS: Record<string, string> = {
  switch: '#3b82f6',
  router: '#8b5cf6',
  server: '#10b981',
  firewall: '#ef4444',
  patch_panel: '#f59e0b',
  storage: '#06b6d4',
  load_balancer: '#ec4899',
  waf: '#f43f5e',
  access_point: '#14b8a6',
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
  const { buildings } = useBuildings();
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all');
  const { graphData, isLoading } = useNetworkGraph(
    selectedBuilding === 'all' ? undefined : selectedBuilding
  );
  const graphRef = useRef<any>();

  const handleNodeClick = useCallback((node: any) => {
    navigate(`/equipment/${node.id}`);
  }, [navigate]);

  const handleZoomIn = () => {
    if (graphRef.current) {
      graphRef.current.zoom(graphRef.current.zoom() * 1.5, 400);
    }
  };

  const handleZoomOut = () => {
    if (graphRef.current) {
      graphRef.current.zoom(graphRef.current.zoom() / 1.5, 400);
    }
  };

  const handleFitView = () => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400, 50);
    }
  };

  const handleExport = () => {
    if (graphRef.current) {
      const canvas = graphRef.current.renderer().domElement;
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `network-map-${new Date().toISOString()}.png`;
      link.href = url;
      link.click();
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Mapa da Rede</h1>
            <p className="text-muted-foreground mt-1">
              Visualização automática da topologia de rede
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleZoomIn}>
              <ZoomIn className="w-4 h-4 mr-2" />
              Aproximar
            </Button>
            <Button variant="outline" onClick={handleZoomOut}>
              <ZoomOut className="w-4 h-4 mr-2" />
              Afastar
            </Button>
            <Button variant="outline" onClick={handleFitView}>
              <Maximize2 className="w-4 h-4 mr-2" />
              Ajustar Tela
            </Button>
            <Button onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Exportar PNG
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por prédio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Prédios</SelectItem>
                  {buildings?.map((building) => (
                    <SelectItem key={building.id} value={building.id}>
                      {building.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="text-sm text-muted-foreground">Nós:</div>
                <Badge variant="secondary">{graphData.nodes.length}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-sm text-muted-foreground">Conexões:</div>
                <Badge variant="secondary">{graphData.links.length}</Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Legend */}
        <Card className="p-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <div className="text-sm font-medium mb-2">Tipos de Equipamento</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(EQUIPMENT_COLORS).map(([type, color]) => (
                  <div key={type} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs capitalize">{type.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium mb-2">Tipos de Cabo</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(CABLE_COLORS).map(([type, color]) => (
                  <div key={type} className="flex items-center gap-2">
                    <div
                      className="w-8 h-0.5"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs uppercase">{type.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Graph */}
        <Card className="p-0 overflow-hidden">
          {isLoading ? (
            <Skeleton className="w-full h-[600px]" />
          ) : (
            <ForceGraph2D
              ref={graphRef}
              graphData={graphData}
              width={1200}
              height={600}
              nodeLabel={(node: any) => `
                <div style="background: white; padding: 8px; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <strong>${node.name}</strong><br/>
                  Tipo: ${node.type}<br/>
                  Prédio: ${node.building}<br/>
                  Sala: ${node.room}<br/>
                  Rack: ${node.rack}
                </div>
              `}
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
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
