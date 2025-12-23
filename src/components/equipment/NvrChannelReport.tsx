import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Server, Download, TrendingUp, Hash, Camera, Search, X, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface NvrChannelReportProps {
  className?: string;
}

export function NvrChannelReport({ className }: NvrChannelReportProps) {
  const navigate = useNavigate();
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [occupancyFilter, setOccupancyFilter] = useState('all');
  
  const { data: nvrs, isLoading } = useQuery({
    queryKey: ['nvrs-channel-report'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment')
        .select('id, name, ip_address, notes, rack:racks(name, room:rooms(name))')
        .eq('type', 'nvr')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  const parseNotes = (notes: string | null) => {
    if (!notes) return {};
    try {
      return typeof notes === 'string' ? JSON.parse(notes) : notes;
    } catch {
      return {};
    }
  };

  const chartData = useMemo(() => nvrs?.map(nvr => {
    const notes = parseNotes(nvr.notes);
    const total = notes.totalChannels || 16;
    const occupied = notes.usedChannels?.length || 0;
    const vacant = notes.vacantChannels?.length || (total - occupied);
    
    return {
      id: nvr.id,
      name: nvr.name.length > 15 ? nvr.name.substring(0, 15) + '...' : nvr.name,
      fullName: nvr.name,
      ip: nvr.ip_address,
      location: nvr.rack?.room?.name || 'N/A',
      occupied,
      vacant,
      total,
      occupancyRate: Math.round((occupied / total) * 100)
    };
  }) || [], [nvrs]);

  // Get unique locations for filter
  const uniqueLocations = useMemo(() => {
    const locations = chartData.map(nvr => nvr.location).filter(loc => loc !== 'N/A');
    return [...new Set(locations)].sort();
  }, [chartData]);

  // Apply filters
  const filteredData = useMemo(() => {
    return chartData.filter(nvr => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesName = nvr.fullName.toLowerCase().includes(search);
        const matchesIp = nvr.ip?.toLowerCase().includes(search);
        if (!matchesName && !matchesIp) return false;
      }
      
      // Location filter
      if (locationFilter !== 'all' && nvr.location !== locationFilter) {
        return false;
      }
      
      // Occupancy filter
      if (occupancyFilter === 'high' && nvr.occupancyRate <= 80) return false;
      if (occupancyFilter === 'medium' && (nvr.occupancyRate < 50 || nvr.occupancyRate > 80)) return false;
      if (occupancyFilter === 'low' && nvr.occupancyRate >= 50) return false;
      
      return true;
    });
  }, [chartData, searchTerm, locationFilter, occupancyFilter]);

  // Summary based on filtered data
  const summary = useMemo(() => ({
    totalNvrs: filteredData.length,
    totalChannels: filteredData.reduce((sum, nvr) => sum + nvr.total, 0),
    occupiedChannels: filteredData.reduce((sum, nvr) => sum + nvr.occupied, 0),
    vacantChannels: filteredData.reduce((sum, nvr) => sum + nvr.vacant, 0),
    avgOccupancy: filteredData.length > 0 
      ? Math.round(filteredData.reduce((sum, nvr) => sum + nvr.occupancyRate, 0) / filteredData.length)
      : 0
  }), [filteredData]);

  const clearFilters = () => {
    setSearchTerm('');
    setLocationFilter('all');
    setOccupancyFilter('all');
  };

  const hasActiveFilters = searchTerm || locationFilter !== 'all' || occupancyFilter !== 'all';

  const exportReport = () => {
    const csvContent = [
      ['NVR', 'IP', 'Localização', 'Total Canais', 'Ocupados', 'Vagos', 'Taxa de Ocupação'].join(';'),
      ...filteredData.map(nvr => [
        nvr.fullName,
        nvr.ip,
        nvr.location,
        nvr.total,
        nvr.occupied,
        nvr.vacant,
        `${nvr.occupancyRate}%`
      ].join(';'))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-canais-nvr-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!chartData.length) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Server className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">Nenhum NVR encontrado</p>
          <p className="text-sm text-muted-foreground">Adicione NVRs para visualizar o relatório de canais</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Filters Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar NVR por nome ou IP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Localização" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Localizações</SelectItem>
                {uniqueLocations.map(location => (
                  <SelectItem key={location} value={location}>{location}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={occupancyFilter} onValueChange={setOccupancyFilter}>
              <SelectTrigger className="w-[180px]">
                <TrendingUp className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Taxa de Ocupação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Taxas</SelectItem>
                <SelectItem value="high">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    Alta (&gt;80%)
                  </span>
                </SelectItem>
                <SelectItem value="medium">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                    Média (50-80%)
                  </span>
                </SelectItem>
                <SelectItem value="low">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Baixa (&lt;50%)
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            
            {hasActiveFilters && (
              <Button variant="outline" size="icon" onClick={clearFilters} title="Limpar filtros">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          {hasActiveFilters && (
            <p className="text-sm text-muted-foreground mt-3">
              Mostrando {filteredData.length} de {chartData.length} NVRs
            </p>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Server className="w-6 h-6 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{summary.totalNvrs}</p>
            <p className="text-xs text-muted-foreground">NVRs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Hash className="w-6 h-6 mx-auto mb-2 text-gray-500" />
            <p className="text-2xl font-bold">{summary.totalChannels}</p>
            <p className="text-xs text-muted-foreground">Total Canais</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Camera className="w-6 h-6 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{summary.occupiedChannels}</p>
            <p className="text-xs text-muted-foreground">Ocupados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Hash className="w-6 h-6 mx-auto mb-2 text-orange-500" />
            <p className="text-2xl font-bold">{summary.vacantChannels}</p>
            <p className="text-xs text-muted-foreground">Vagos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold">{summary.avgOccupancy}%</p>
            <p className="text-xs text-muted-foreground">Média Ocupação</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="w-4 h-4" />
            Ocupação de Canais por NVR
          </CardTitle>
          <Button variant="outline" size="sm" onClick={exportReport}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </CardHeader>
        <CardContent>
          {filteredData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(300, filteredData.length * 40)}>
              <BarChart data={filteredData} layout="vertical">
                <XAxis type="number" domain={[0, 'dataMax']} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover border rounded-lg p-3 shadow-lg">
                        <p className="font-medium">{data.fullName}</p>
                        <p className="text-xs text-muted-foreground mb-2">{data.ip}</p>
                        <div className="space-y-1 text-sm">
                          <p className="text-green-600">Ocupados: {data.occupied}</p>
                          <p className="text-orange-600">Vagos: {data.vacant}</p>
                          <p className="text-muted-foreground">Total: {data.total}</p>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="occupied" 
                  stackId="a" 
                  fill="hsl(var(--chart-2))" 
                  name="Ocupados" 
                  radius={[0, 0, 0, 0]}
                />
                <Bar 
                  dataKey="vacant" 
                  stackId="a" 
                  fill="hsl(var(--chart-4))" 
                  name="Vagos"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Nenhum NVR encontrado com os filtros aplicados</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalhamento por NVR</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredData.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NVR</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Ocupados</TableHead>
                  <TableHead className="text-center">Vagos</TableHead>
                  <TableHead className="w-[200px]">Ocupação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map(nvr => (
                  <TableRow 
                    key={nvr.id} 
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => navigate(`/equipment/${nvr.id}`)}
                  >
                    <TableCell className="font-medium">{nvr.fullName}</TableCell>
                    <TableCell className="font-mono text-sm">{nvr.ip || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{nvr.location}</TableCell>
                    <TableCell className="text-center">{nvr.total}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-green-500/10 text-green-600">
                        {nvr.occupied}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-orange-500/10 text-orange-600">
                        {nvr.vacant}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={nvr.occupancyRate} 
                          className="h-2 flex-1"
                        />
                        <span className="text-sm font-medium w-12 text-right">
                          {nvr.occupancyRate}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Search className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Nenhum NVR encontrado com os filtros aplicados</p>
              <Button variant="link" onClick={clearFilters} className="mt-2">
                Limpar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
