import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ForceGraph2D from 'react-force-graph-2d';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ZoomIn, ZoomOut, Maximize, Download, MapPin, Route } from 'lucide-react';
import { useNetworkGraph } from '@/hooks/useNetworkGraph';
import { useBuildings } from '@/hooks/useBuildings';
import { EQUIPMENT_CATEGORIES } from '@/constants/equipmentTypes';
import { EQUIPMENT_COLORS, CABLE_COLORS, getEquipmentColor, getCableColor } from '@/constants/equipmentColors';
import { CABLE_TYPES, getCableTypeLabel } from '@/constants/cables';
import { toast } from 'sonner';

export default function NetworkMap() {
  const navigate = useNavigate();
  const graphRef = useRef<any>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [buildingFilter, setBuildingFilter] = useState<string>('all');
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [selectedCableTypes, setSelectedCableTypes] = useState<Set<string>>(new Set());
  const [selectedStatus, setSelectedStatus] = useState<Set<string>>(new Set());
  const [zoomLevel, setZoomLevel] = useState(1);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredNode, setHoveredNode] = useState<any>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  // Path visualization state
  const [pathMode, setPathMode] = useState(false);
  const [pathSource, setPathSource] = useState<string | null>(null);
  const [pathTarget, setPathTarget] = useState<string | null>(null);
  const [highlightedPath, setHighlightedPath] = useState<Set<string>>(new Set());
  
  const { graphData, isLoading } = useNetworkGraph(
    buildingFilter === 'all' ? undefined : buildingFilter,
    selectedTypes.size > 0 ? selectedTypes : undefined,
    selectedCableTypes.size > 0 ? selectedCableTypes : undefined,
    selectedStatus.size > 0 ? selectedStatus : undefined
  );
  const { buildings } = useBuildings();
  
  // Get all unique equipment types from graphData
  const availableTypes = Array.from(new Set(graphData.nodes.map(n => n.type)));
  
  // Get all unique cable types and statuses from graphData
  const availableCableTypes = Array.from(new Set(graphData.links.map(l => l.cableType)));
  const availableStatuses = Array.from(new Set(graphData.links.map(l => l.status)));
  
  // Calculate connection counts per node
  const connectionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    graphData.links.forEach(link => {
      const sourceId = typeof link.source === 'string' ? link.source : (link.source as any)?.id;
      const targetId = typeof link.target === 'string' ? link.target : (link.target as any)?.id;
      if (sourceId) counts.set(sourceId, (counts.get(sourceId) || 0) + 1);
      if (targetId) counts.set(targetId, (counts.get(targetId) || 0) + 1);
    });
    return counts;
  }, [graphData.links]);
  
  // Generate building colors for clusters
  const buildingColors = useMemo(() => {
    const buildings = [...new Set(graphData.nodes.map(n => n.building))];
    const palette = [
      'rgba(254, 243, 199, 0.3)', // amber
      'rgba(219, 234, 254, 0.3)', // blue
      'rgba(220, 252, 231, 0.3)', // green
      'rgba(252, 231, 243, 0.3)', // pink
      'rgba(224, 231, 255, 0.3)', // indigo
      'rgba(254, 202, 202, 0.3)', // red
    ];
    return new Map(buildings.map((b, i) => [b, palette[i % palette.length]]));
  }, [graphData.nodes]);
  
  // Building colors for node borders
  const buildingBorderColors = useMemo(() => {
    const buildings = [...new Set(graphData.nodes.map(n => n.building))];
    const palette = [
      '#f59e0b', // amber
      '#3b82f6', // blue
      '#10b981', // green
      '#ec4899', // pink
      '#6366f1', // indigo
      '#ef4444', // red
    ];
    return new Map(buildings.map((b, i) => [b, palette[i % palette.length]]));
  }, [graphData.nodes]);
  
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
  
  const toggleCableType = useCallback((type: string) => {
    setSelectedCableTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);
  
  const clearCableFilter = useCallback(() => {
    setSelectedCableTypes(new Set());
  }, []);
  
  const toggleStatus = useCallback((status: string) => {
    setSelectedStatus(prev => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  }, []);
  
  const clearStatusFilter = useCallback(() => {
    setSelectedStatus(new Set());
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

  // BFS algorithm to find path between two nodes
  const findPath = useCallback((sourceId: string, targetId: string) => {
    // Build adjacency list
    const adjacencyList = new Map<string, string[]>();
    graphData.links.forEach(link => {
      const source = typeof link.source === 'string' ? link.source : (link.source as any)?.id;
      const target = typeof link.target === 'string' ? link.target : (link.target as any)?.id;
      
      if (!source || !target) return;
      
      if (!adjacencyList.has(source)) adjacencyList.set(source, []);
      if (!adjacencyList.has(target)) adjacencyList.set(target, []);
      adjacencyList.get(source)!.push(target);
      adjacencyList.get(target)!.push(source);
    });
    
    // BFS to find shortest path
    const queue: string[][] = [[sourceId]];
    const visited = new Set<string>([sourceId]);
    
    while (queue.length > 0) {
      const path = queue.shift()!;
      const current = path[path.length - 1];
      
      if (current === targetId) {
        return path; // Path found!
      }
      
      for (const neighbor of adjacencyList.get(current) || []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([...path, neighbor]);
        }
      }
    }
    
    return null; // No path
  }, [graphData.links]);
  
  const clearPath = useCallback(() => {
    setPathSource(null);
    setPathTarget(null);
    setHighlightedPath(new Set());
  }, []);
  
  const handleNodeClick = useCallback((node: any) => {
    if (pathMode) {
      if (!pathSource) {
        setPathSource(node.id);
        toast.info(`Origem selecionada: ${node.name}`);
      } else if (!pathTarget && node.id !== pathSource) {
        setPathTarget(node.id);
        // Calculate path
        const path = findPath(pathSource, node.id);
        if (path) {
          setHighlightedPath(new Set(path));
          toast.success(`Caminho encontrado com ${path.length} equipamentos`);
        } else {
          toast.error('Não há caminho entre estes equipamentos');
          clearPath();
        }
      }
    } else {
      navigate(`/equipment/${node.id}`);
    }
  }, [pathMode, pathSource, pathTarget, findPath, navigate, clearPath]);
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);
  
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: 'Ativo',
      inactive: 'Inativo',
      reserved: 'Reservado',
      testing: 'Teste',
      faulty: 'Falha',
    };
    return labels[status] || status;
  };
  
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-500',
      inactive: 'bg-gray-400',
      reserved: 'bg-yellow-500',
      testing: 'bg-blue-500',
      faulty: 'bg-red-500',
    };
    return colors[status] || 'bg-gray-400';
  };

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
            <Button 
              variant={pathMode ? "default" : "outline"} 
              onClick={() => {
                setPathMode(!pathMode);
                if (pathMode) clearPath();
              }}
            >
              <Route className="w-4 h-4 mr-2" />
              Modo Caminho
            </Button>
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
        
        {pathMode && (
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">
                  {!pathSource 
                    ? "🔵 Clique no equipamento de ORIGEM"
                    : !pathTarget
                    ? "🔴 Clique no equipamento de DESTINO"
                    : `Caminho: ${graphData.nodes.find(n => n.id === pathSource)?.name} → ${graphData.nodes.find(n => n.id === pathTarget)?.name}`
                  }
                </p>
                {highlightedPath.size > 0 && (
                  <Badge variant="secondary" className="mt-1">
                    📍 {highlightedPath.size} equipamentos no caminho
                  </Badge>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={clearPath}>
                Limpar
              </Button>
            </div>
          </Card>
        )}
        
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
          <div className="grid grid-cols-[1fr_340px] gap-6">
            <Card className="p-4 relative" ref={containerRef} onMouseMove={handleMouseMove}>
              <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                nodeLabel="name"
                nodeAutoColorBy="type"
                width={dimensions.width}
                height={dimensions.height}
                nodeColor={(node: any) => getEquipmentColor(node.type)}
                nodeRelSize={6}
                nodeCanvasObjectMode={() => 'replace'}
                onNodeHover={(node) => setHoveredNode(node)}
                onRenderFramePre={(ctx) => {
                  // Draw building clusters in background
                  const clusterNodes = new Map<string, any[]>();
                  graphData.nodes.forEach((node: any) => {
                    if (!clusterNodes.has(node.building)) {
                      clusterNodes.set(node.building, []);
                    }
                    clusterNodes.get(node.building)!.push(node);
                  });
                  
                  clusterNodes.forEach((nodes, building) => {
                    if (nodes.length === 0) return;
                    
                    const xs = nodes.map(n => n.x);
                    const ys = nodes.map(n => n.y);
                    const minX = Math.min(...xs) - 40;
                    const maxX = Math.max(...xs) + 40;
                    const minY = Math.min(...ys) - 40;
                    const maxY = Math.max(...ys) + 40;
                    
                    const color = buildingColors.get(building) || 'rgba(200, 200, 200, 0.1)';
                    ctx.fillStyle = color;
                    ctx.strokeStyle = buildingBorderColors.get(building) || '#ccc';
                    ctx.lineWidth = 2;
                    
                    const radius = 20;
                    ctx.beginPath();
                    ctx.moveTo(minX + radius, minY);
                    ctx.lineTo(maxX - radius, minY);
                    ctx.arcTo(maxX, minY, maxX, minY + radius, radius);
                    ctx.lineTo(maxX, maxY - radius);
                    ctx.arcTo(maxX, maxY, maxX - radius, maxY, radius);
                    ctx.lineTo(minX + radius, maxY);
                    ctx.arcTo(minX, maxY, minX, maxY - radius, radius);
                    ctx.lineTo(minX, minY + radius);
                    ctx.arcTo(minX, minY, minX + radius, minY, radius);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                  });
                }}
                nodeCanvasObject={(node: any, ctx, globalScale) => {
                  const isInPath = highlightedPath.has(node.id);
                  const isSource = node.id === pathSource;
                  const isTarget = node.id === pathTarget;
                  const isHovered = hoveredNode?.id === node.id;
                  
                  let color = getEquipmentColor(node.type);
                  let nodeSize = 8;
                  
                  // Special styling for path nodes
                  if (isSource) {
                    color = '#22c55e'; // Green - source
                    nodeSize = 12;
                  } else if (isTarget) {
                    color = '#ef4444'; // Red - target
                    nodeSize = 12;
                  } else if (isInPath) {
                    nodeSize = 10;
                  }
                  
                  // Pulsing border for nodes in path
                  if (isInPath && !isSource && !isTarget) {
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, nodeSize + 4, 0, 2 * Math.PI);
                    ctx.strokeStyle = '#fbbf24';
                    ctx.lineWidth = 3;
                    ctx.stroke();
                  }
                  
                  // Draw node circle
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI, false);
                  ctx.fillStyle = color;
                  ctx.fill();
                  
                  // Border - building color or hover/path color
                  const buildingBorder = buildingBorderColors.get(node.building) || '#fff';
                  ctx.strokeStyle = isHovered ? '#000' : (isInPath ? '#fbbf24' : buildingBorder);
                  ctx.lineWidth = isHovered ? 3 : 2;
                  ctx.stroke();
                  
                  // Label
                  const label = node.name;
                  const fontSize = 12 / globalScale;
                  ctx.font = `${fontSize}px Sans-Serif`;
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'top';
                  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                  ctx.fillText(label, node.x, node.y + nodeSize + 3);
                }}
                linkLabel={(link: any) => `
                  <div style="background: white; padding: 6px; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <strong>${link.connectionCode}</strong><br/>
                    Cabo: ${link.cableType}<br/>
                    Status: ${link.status}
                  </div>
                `}
                linkWidth={(link: any) => {
                  const sourceId = typeof link.source === 'string' ? link.source : (link.source as any)?.id;
                  const targetId = typeof link.target === 'string' ? link.target : (link.target as any)?.id;
                  
                  // Check if both endpoints are in highlighted path
                  const isInPath = sourceId && targetId && highlightedPath.has(sourceId) && highlightedPath.has(targetId);
                  return isInPath ? 5 : 2;
                }}
                linkColor={(link: any) => {
                  const sourceId = typeof link.source === 'string' ? link.source : (link.source as any)?.id;
                  const targetId = typeof link.target === 'string' ? link.target : (link.target as any)?.id;
                  
                  // Highlight path connections
                  const isInPath = sourceId && targetId && highlightedPath.has(sourceId) && highlightedPath.has(targetId);
                  return isInPath ? '#fbbf24' : getCableColor(link.cableType);
                }}
                linkDirectionalParticles={2}
                linkDirectionalParticleWidth={2}
                onNodeClick={handleNodeClick}
                cooldownTicks={100}
                d3VelocityDecay={0.3}
              />
              
              {/* Tooltip */}
              {hoveredNode && (
                <div 
                  className="absolute z-50 bg-white p-3 rounded-lg shadow-lg border pointer-events-none"
                  style={{
                    left: mousePos.x - (containerRef.current?.getBoundingClientRect().left || 0) + 15,
                    top: mousePos.y - (containerRef.current?.getBoundingClientRect().top || 0) - 15,
                  }}
                >
                  <h4 className="font-bold text-sm mb-1">{hoveredNode.name}</h4>
                  <div className="space-y-0.5 text-xs">
                    <p className="text-muted-foreground">
                      <span className="font-medium">Tipo:</span> {EQUIPMENT_CATEGORIES.flatMap(c => c.types).find(t => t.value === hoveredNode.type)?.label || hoveredNode.type}
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium">Prédio:</span> {hoveredNode.building}
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium">Sala:</span> {hoveredNode.room}
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium">Rack:</span> {hoveredNode.rack}
                    </p>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      🔗 {connectionCounts.get(hoveredNode.id) || 0} conexões
                    </Badge>
                  </div>
                </div>
              )}
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
                      const color = getEquipmentColor(type.value);
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
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">🔗 Filtrar Cabos</h3>
                  {selectedCableTypes.size > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearCableFilter}>
                      Mostrar Todos
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {CABLE_TYPES.filter(ct => availableCableTypes.includes(ct.value)).map(cableType => {
                    const color = getCableColor(cableType.value);
                    const isSelected = selectedCableTypes.size === 0 || selectedCableTypes.has(cableType.value);
                    const count = graphData.links.filter(l => l.cableType === cableType.value).length;
                    return (
                      <button
                        key={cableType.value}
                        onClick={() => toggleCableType(cableType.value)}
                        className={`w-full flex items-center gap-2 p-2 rounded-md transition-all ${
                          isSelected 
                            ? 'bg-primary/10 hover:bg-primary/20' 
                            : 'opacity-40 hover:opacity-60'
                        }`}
                      >
                        <div className="w-8 h-0.5 flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-xs flex-1 text-left">{cableType.label}</span>
                        <Badge variant="secondary" className="text-xs">{count}</Badge>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">📊 Status</h3>
                  {selectedStatus.size > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearStatusFilter}>
                      Mostrar Todos
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {availableStatuses.map(status => {
                    const isSelected = selectedStatus.size === 0 || selectedStatus.has(status);
                    const count = graphData.links.filter(l => l.status === status).length;
                    return (
                      <button
                        key={status}
                        onClick={() => toggleStatus(status)}
                        className={`w-full flex items-center gap-2 p-2 rounded-md transition-all ${
                          isSelected 
                            ? 'bg-primary/10 hover:bg-primary/20' 
                            : 'opacity-40 hover:opacity-60'
                        }`}
                      >
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`} />
                        <span className="text-xs flex-1 text-left">{getStatusLabel(status)}</span>
                        <Badge variant="secondary" className="text-xs">{count}</Badge>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Clusters
                </h3>
                <div className="space-y-2">
                  {Array.from(buildingColors.entries()).map(([building, color]) => {
                    const borderColor = buildingBorderColors.get(building);
                    const nodeCount = graphData.nodes.filter(n => n.building === building).length;
                    return (
                      <div key={building} className="flex items-center gap-2 text-xs">
                        <div 
                          className="w-4 h-4 rounded border-2 flex-shrink-0" 
                          style={{ 
                            backgroundColor: color,
                            borderColor: borderColor
                          }} 
                        />
                        <span className="flex-1">{building}</span>
                        <Badge variant="outline" className="text-xs">{nodeCount}</Badge>
                      </div>
                    );
                  })}
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
