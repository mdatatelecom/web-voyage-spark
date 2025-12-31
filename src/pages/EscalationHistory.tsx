import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  useEscalationHistory, 
  getNotificationTypeLabel, 
  getNotificationTypeColor,
  getPriorityLabel,
  EscalationType
} from '@/hooks/useEscalationHistory';
import { useTechnicians } from '@/hooks/useTechnicians';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ArrowLeft, 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  ArrowRight,
  History,
  Filter
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const EscalationHistory = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<'7days' | '30days' | '90days' | 'all'>('30days');
  const [type, setType] = useState<EscalationType>('all');
  const [technicianId, setTechnicianId] = useState<string>('all');

  const { data, isLoading } = useEscalationHistory({
    period,
    type,
    technicianId: technicianId !== 'all' ? technicianId : undefined
  });

  const { technicians } = useTechnicians();

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/tickets')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <History className="h-8 w-8 text-primary" />
                Histórico de Escalonamentos
              </h1>
              <p className="text-muted-foreground">
                Chamados com prioridade alterada ou alertas de prazo
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))
          ) : data?.stats ? (
            <>
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total de Eventos</p>
                      <p className="text-3xl font-bold text-primary">{data.stats.total}</p>
                    </div>
                    <History className="h-10 w-10 text-primary/50" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Escalonamentos</p>
                      <p className="text-3xl font-bold text-amber-500">{data.stats.escalations}</p>
                    </div>
                    <TrendingUp className="h-10 w-10 text-amber-500/50" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Alertas de Atraso</p>
                      <p className="text-3xl font-bold text-red-500">{data.stats.overdueWarnings}</p>
                    </div>
                    <AlertTriangle className="h-10 w-10 text-red-500/50" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Alertas Críticos</p>
                      <p className="text-3xl font-bold text-orange-500">{data.stats.criticalWarnings}</p>
                    </div>
                    <Clock className="h-10 w-10 text-orange-500/50" />
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Período</label>
                <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7days">Últimos 7 dias</SelectItem>
                    <SelectItem value="30days">Últimos 30 dias</SelectItem>
                    <SelectItem value="90days">Últimos 90 dias</SelectItem>
                    <SelectItem value="all">Todo o período</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Tipo de Evento</label>
                <Select value={type} onValueChange={(v: any) => setType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="escalation">Escalonamentos</SelectItem>
                    <SelectItem value="overdue_warning">Alertas de Atraso</SelectItem>
                    <SelectItem value="critical_warning">Alertas Críticos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Técnico</label>
                <Select value={technicianId} onValueChange={setTechnicianId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {technicians?.map(tech => (
                      <SelectItem key={tech.id} value={tech.id}>
                        {tech.full_name || 'Sem nome'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Eventos de Escalonamento</CardTitle>
            <CardDescription>
              Lista de todos os eventos de escalonamento e alertas de prazo
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : data?.records.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum evento de escalonamento encontrado</p>
                <p className="text-sm">Os eventos aparecerão aqui quando ocorrerem</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Chamado</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>Técnico</TableHead>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.records.map(record => (
                      <TableRow key={record.id}>
                        <TableCell className="font-mono font-medium">
                          {record.ticket_number}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {record.ticket_title}
                        </TableCell>
                        <TableCell>
                          <Badge className={getNotificationTypeColor(record.notification_type)}>
                            {getNotificationTypeLabel(record.notification_type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {record.notification_type === 'escalation' ? (
                            <div className="flex items-center gap-1 text-sm">
                              <span className="text-muted-foreground">
                                {getPriorityLabel(record.old_priority)}
                              </span>
                              <ArrowRight className="h-3 w-3" />
                              <span className="font-medium text-amber-600 dark:text-amber-400">
                                {getPriorityLabel(record.new_priority)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {record.technician_name || (
                            <span className="text-muted-foreground italic">Não atribuído</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(parseISO(record.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/tickets/${record.ticket_id}`)}
                          >
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default EscalationHistory;
