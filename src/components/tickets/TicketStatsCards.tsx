import { Card, CardContent } from '@/components/ui/card';
import { Ticket, Clock, CheckCircle2, AlertCircle, TrendingUp, TrendingDown, Users } from 'lucide-react';
import { useTicketStats, formatResolutionTime } from '@/hooks/useTicketStats';
import { Skeleton } from '@/components/ui/skeleton';

export const TicketStatsCards = () => {
  const { data: stats, isLoading } = useTicketStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    {
      title: 'Abertos',
      value: stats.openTickets,
      icon: Ticket,
      gradient: 'from-blue-500 to-blue-600',
      textColor: 'text-blue-50',
      subtext: `+${stats.createdToday} hoje`,
      subtextPositive: stats.createdToday > 0
    },
    {
      title: 'Em Andamento',
      value: stats.inProgressTickets,
      icon: Clock,
      gradient: 'from-amber-500 to-orange-500',
      textColor: 'text-amber-50',
      subtext: null
    },
    {
      title: 'Resolvidos',
      value: stats.resolvedTickets,
      icon: CheckCircle2,
      gradient: 'from-emerald-500 to-green-600',
      textColor: 'text-emerald-50',
      subtext: `+${stats.resolvedToday} hoje`,
      subtextPositive: true
    },
    {
      title: 'T. Médio',
      value: formatResolutionTime(stats.avgResolutionTimeMinutes),
      icon: TrendingUp,
      gradient: 'from-purple-500 to-violet-600',
      textColor: 'text-purple-50',
      subtext: 'Resolução',
      isText: true
    },
    {
      title: 'Técnicos',
      value: stats.ticketsByTechnician.length,
      icon: Users,
      gradient: 'from-slate-600 to-slate-700',
      textColor: 'text-slate-50',
      subtext: 'Ativos'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <Card
          key={card.title}
          className={`relative overflow-hidden bg-gradient-to-br ${card.gradient} border-0 shadow-lg`}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-xs font-medium ${card.textColor} opacity-80`}>
                  {card.title}
                </p>
                <p className={`text-2xl font-bold mt-1 ${card.textColor}`}>
                  {card.value}
                </p>
                {card.subtext && (
                  <p className={`text-xs mt-1 ${card.textColor} opacity-70`}>
                    {card.subtext}
                  </p>
                )}
              </div>
              <card.icon className={`h-8 w-8 ${card.textColor} opacity-30`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
