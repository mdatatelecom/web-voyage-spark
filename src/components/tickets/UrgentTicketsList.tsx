import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTicketStats } from '@/hooks/useTicketStats';
import { Clock, AlertTriangle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

export const UrgentTicketsList = () => {
  const { data: stats, isLoading } = useTicketStats();
  const navigate = useNavigate();

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
  const overdueCount = stats.overdueTickets;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <span>Chamados Próximos do Prazo</span>
          </div>
          {overdueCount > 0 && (
            <Badge variant="destructive">
              {overdueCount} atrasado{overdueCount > 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {urgentTickets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>Nenhum chamado vencendo nas próximas 24 horas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {urgentTickets.slice(0, 5).map((ticket) => (
              <div 
                key={ticket.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-medium text-primary">
                      {ticket.ticket_number}
                    </span>
                    <Badge variant="outline" className={getPriorityColor(ticket.priority)}>
                      {getPriorityLabel(ticket.priority)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {ticket.title}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-amber-500">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">{ticket.hoursRemaining}h</span>
                    </div>
                    <p className="text-xs text-muted-foreground">restantes</p>
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
            ))}
            
            {urgentTickets.length > 5 && (
              <p className="text-center text-sm text-muted-foreground pt-2">
                +{urgentTickets.length - 5} chamados adicionais
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
