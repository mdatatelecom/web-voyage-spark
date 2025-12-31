import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTicketStats, DeadlineStatus } from '@/hooks/useTicketStats';
import { Clock, AlertTriangle, AlertCircle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';

const getPriorityColor = (priority: string) => {
  const colors: Record<string, string> = {
    low: 'bg-green-500/10 text-green-500 border-green-500/20',
    medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    critical: 'bg-red-500/10 text-red-500 border-red-500/20'
  };
  return colors[priority] || colors.medium;
};

const getPriorityLabel = (priority: string) => {
  const labels: Record<string, string> = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    critical: 'Crítica'
  };
  return labels[priority] || priority;
};

const getDeadlineStyle = (status: DeadlineStatus) => {
  switch (status) {
    case 'overdue':
      return {
        bgColor: 'bg-red-500/10 border-red-500/30',
        textColor: 'text-red-500',
        Icon: AlertTriangle,
      };
    case 'critical':
      return {
        bgColor: 'bg-orange-500/10 border-orange-500/30',
        textColor: 'text-orange-500',
        Icon: AlertCircle,
      };
    case 'warning':
      return {
        bgColor: 'bg-yellow-500/10 border-yellow-500/30',
        textColor: 'text-yellow-500',
        Icon: Clock,
      };
    default:
      return {
        bgColor: 'bg-blue-500/10 border-blue-500/30',
        textColor: 'text-blue-500',
        Icon: Clock,
      };
  }
};

const formatTimeLabel = (hoursRemaining: number, status: DeadlineStatus) => {
  const absHours = Math.abs(hoursRemaining);
  if (status === 'overdue') {
    if (absHours >= 24) {
      const days = Math.floor(absHours / 24);
      return `${days}d atrasado`;
    }
    return `${absHours}h atrasado`;
  }
  if (absHours >= 24) {
    const days = Math.floor(absHours / 24);
    const remainingHours = absHours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }
  return `${absHours}h restantes`;
};

type FilterType = 'all' | 'overdue' | 'critical' | 'warning';

export const UrgentTicketsList = () => {
  const { data: stats, isLoading } = useTicketStats();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterType>('all');

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Chamados Próximos do Prazo</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const urgentTickets = stats.urgentTickets;
  const overdueCount = urgentTickets.filter(t => t.deadlineStatus === 'overdue').length;
  const criticalCount = urgentTickets.filter(t => t.deadlineStatus === 'critical').length;
  const warningCount = urgentTickets.filter(t => t.deadlineStatus === 'warning').length;

  const filteredTickets = filter === 'all' 
    ? urgentTickets 
    : urgentTickets.filter(t => t.deadlineStatus === filter);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <span>Chamados Próximos do Prazo</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filter badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge 
            variant={filter === 'all' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilter('all')}
          >
            Todos ({urgentTickets.length})
          </Badge>
          {overdueCount > 0 && (
            <Badge 
              variant={filter === 'overdue' ? 'destructive' : 'outline'}
              className={`cursor-pointer ${filter !== 'overdue' ? 'border-red-500/50 text-red-500' : ''}`}
              onClick={() => setFilter('overdue')}
            >
              Atrasados ({overdueCount})
            </Badge>
          )}
          {criticalCount > 0 && (
            <Badge 
              variant={filter === 'critical' ? 'default' : 'outline'}
              className={`cursor-pointer ${filter === 'critical' ? 'bg-orange-500 hover:bg-orange-600' : 'border-orange-500/50 text-orange-500'}`}
              onClick={() => setFilter('critical')}
            >
              Críticos ({criticalCount})
            </Badge>
          )}
          {warningCount > 0 && (
            <Badge 
              variant={filter === 'warning' ? 'default' : 'outline'}
              className={`cursor-pointer ${filter === 'warning' ? 'bg-yellow-500 hover:bg-yellow-600 text-black' : 'border-yellow-500/50 text-yellow-500'}`}
              onClick={() => setFilter('warning')}
            >
              Em alerta ({warningCount})
            </Badge>
          )}
        </div>

        {filteredTickets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>
              {filter === 'all' 
                ? 'Nenhum chamado próximo do prazo ou atrasado'
                : `Nenhum chamado ${filter === 'overdue' ? 'atrasado' : filter === 'critical' ? 'crítico' : 'em alerta'}`
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTickets.slice(0, 10).map((ticket) => {
              const style = getDeadlineStyle(ticket.deadlineStatus);
              const { Icon } = style;
              
              return (
                <div 
                  key={ticket.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${style.bgColor} transition-colors`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`h-4 w-4 ${style.textColor}`} />
                      <span className="font-mono text-sm font-medium text-primary">
                        {ticket.ticket_number}
                      </span>
                      <Badge variant="outline" className={getPriorityColor(ticket.priority)}>
                        {getPriorityLabel(ticket.priority)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate pl-6">
                      {ticket.title}
                    </p>
                    <p className="text-xs text-muted-foreground pl-6 mt-1">
                      Prazo: {format(parseISO(ticket.due_date), 'dd/MM/yyyy HH:mm')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <div className="text-right">
                      <div className={`flex items-center gap-1 ${style.textColor}`}>
                        <span className="font-medium text-sm">
                          {formatTimeLabel(ticket.hoursRemaining, ticket.deadlineStatus)}
                        </span>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => navigate(`/tickets/${ticket.id}`)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            
            {filteredTickets.length > 10 && (
              <p className="text-center text-sm text-muted-foreground pt-2">
                +{filteredTickets.length - 10} chamados adicionais
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
