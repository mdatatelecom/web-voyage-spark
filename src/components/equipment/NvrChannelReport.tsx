import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Server, Download, TrendingUp, Hash, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface NvrChannelReportProps {
  className?: string;
}

export function NvrChannelReport({ className }: NvrChannelReportProps) {
  const navigate = useNavigate();
  
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

  const chartData = nvrs?.map(nvr => {
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
  }) || [];

  const summary = {
    totalNvrs: chartData.length,
    totalChannels: chartData.reduce((sum, nvr) => sum + nvr.total, 0),
    occupiedChannels: chartData.reduce((sum, nvr) => sum + nvr.occupied, 0),
    vacantChannels: chartData.reduce((sum, nvr) => sum + nvr.vacant, 0),
    avgOccupancy: chartData.length > 0 
      ? Math.round(chartData.reduce((sum, nvr) => sum + nvr.occupancyRate, 0) / chartData.length)
      : 0
  };

  const exportReport = () => {
    const csvContent = [
      ['NVR', 'IP', 'Localização', 'Total Canais', 'Ocupados', 'Vagos', 'Taxa de Ocupação'].join(';'),
      ...chartData.map(nvr => [
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
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="vertical">
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
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalhamento por NVR</CardTitle>
        </CardHeader>
        <CardContent>
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
              {chartData.map(nvr => (
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
        </CardContent>
      </Card>
    </div>
  );
}
