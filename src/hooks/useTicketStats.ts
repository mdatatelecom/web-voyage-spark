import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInHours, differenceInMinutes, startOfDay, subDays, subMonths, isAfter, isBefore, parseISO, format, startOfMonth, endOfMonth } from 'date-fns';

export interface TicketStats {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  resolvedToday: number;
  createdToday: number;
  avgResolutionTimeMinutes: number;
  ticketsByCategory: { category: string; count: number; label: string }[];
  ticketsByTechnician: { name: string; id: string; resolved: number; pending: number; total: number }[];
  ticketsByStatus: { status: string; count: number; label: string }[];
  ticketsTrend: { date: string; created: number; resolved: number }[];
  ticketsByPriority: { priority: string; count: number; label: string }[];
  // Advanced metrics
  slaCompliance: number;
  overdueTickets: number;
  urgentTickets: { id: string; ticket_number: string; title: string; due_date: string; priority: string; hoursRemaining: number }[];
  resolutionByCategory: { category: string; label: string; avgMinutes: number; count: number }[];
  monthlyTrend: { month: string; created: number; resolved: number; avgResolutionMinutes: number }[];
}

const getCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    hardware: 'Hardware',
    software: 'Software',
    network: 'Rede',
    access: 'Acesso',
    maintenance: 'Manutenção',
    installation: 'Instalação',
    other: 'Outros'
  };
  return labels[category] || category;
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    open: 'Aberto',
    in_progress: 'Em Andamento',
    resolved: 'Resolvido',
    closed: 'Fechado'
  };
  return labels[status] || status;
};

const getPriorityLabel = (priority: string): string => {
  const labels: Record<string, string> = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    critical: 'Crítica'
  };
  return labels[priority] || priority;
};

export const useTicketStats = () => {
  return useQuery({
    queryKey: ['ticket-stats'],
    queryFn: async (): Promise<TicketStats> => {
      const now = new Date();
      const today = startOfDay(now);
      const sevenDaysAgo = subDays(today, 7);

      // Fetch all tickets
      const { data: tickets, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const allTickets = tickets || [];

      // Basic counts
      const totalTickets = allTickets.length;
      const openTickets = allTickets.filter(t => t.status === 'open').length;
      const inProgressTickets = allTickets.filter(t => t.status === 'in_progress').length;
      const resolvedTickets = allTickets.filter(t => t.status === 'resolved').length;
      const closedTickets = allTickets.filter(t => t.status === 'closed').length;

      // Today stats
      const createdToday = allTickets.filter(t => 
        isAfter(parseISO(t.created_at!), today)
      ).length;
      
      const resolvedToday = allTickets.filter(t => 
        t.resolved_at && isAfter(parseISO(t.resolved_at), today)
      ).length;

      // Calculate average resolution time
      const resolvedWithTime = allTickets.filter(t => t.resolved_at && t.created_at);
      let avgResolutionTimeMinutes = 0;
      if (resolvedWithTime.length > 0) {
        const totalMinutes = resolvedWithTime.reduce((sum, t) => {
          const created = parseISO(t.created_at!);
          const resolved = parseISO(t.resolved_at!);
          return sum + differenceInMinutes(resolved, created);
        }, 0);
        avgResolutionTimeMinutes = Math.round(totalMinutes / resolvedWithTime.length);
      }

      // By category
      const categoryMap = new Map<string, number>();
      allTickets.forEach(t => {
        const cat = t.category || 'other';
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
      });
      const ticketsByCategory = Array.from(categoryMap.entries()).map(([category, count]) => ({
        category,
        count,
        label: getCategoryLabel(category)
      })).sort((a, b) => b.count - a.count);

      // By status
      const statusMap = new Map<string, number>();
      allTickets.forEach(t => {
        statusMap.set(t.status, (statusMap.get(t.status) || 0) + 1);
      });
      const ticketsByStatus = Array.from(statusMap.entries()).map(([status, count]) => ({
        status,
        count,
        label: getStatusLabel(status)
      }));

      // By priority
      const priorityMap = new Map<string, number>();
      allTickets.forEach(t => {
        priorityMap.set(t.priority, (priorityMap.get(t.priority) || 0) + 1);
      });
      const ticketsByPriority = Array.from(priorityMap.entries()).map(([priority, count]) => ({
        priority,
        count,
        label: getPriorityLabel(priority)
      }));

      // By technician - need to fetch profiles
      const technicianIds = [...new Set(allTickets.filter(t => t.assigned_to).map(t => t.assigned_to!))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', technicianIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name || 'Sem nome']) || []);
      
      const techMap = new Map<string, { resolved: number; pending: number }>();
      allTickets.filter(t => t.assigned_to).forEach(t => {
        const id = t.assigned_to!;
        const current = techMap.get(id) || { resolved: 0, pending: 0 };
        if (t.status === 'resolved' || t.status === 'closed') {
          current.resolved++;
        } else {
          current.pending++;
        }
        techMap.set(id, current);
      });
      
      const ticketsByTechnician = Array.from(techMap.entries()).map(([id, stats]) => ({
        id,
        name: profileMap.get(id) || 'Desconhecido',
        resolved: stats.resolved,
        pending: stats.pending,
        total: stats.resolved + stats.pending
      })).sort((a, b) => b.total - a.total);

      // Trend (last 7 days)
      const ticketsTrend: { date: string; created: number; resolved: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const day = subDays(today, i);
        const nextDay = subDays(today, i - 1);
        
        const createdCount = allTickets.filter(t => {
          const created = parseISO(t.created_at!);
          return isAfter(created, day) && (i === 0 || !isAfter(created, nextDay));
        }).length;
        
        const resolvedCount = allTickets.filter(t => {
          if (!t.resolved_at) return false;
          const resolved = parseISO(t.resolved_at);
          return isAfter(resolved, day) && (i === 0 || !isAfter(resolved, nextDay));
        }).length;
        
        ticketsTrend.push({
          date: day.toISOString().split('T')[0],
          created: createdCount,
          resolved: resolvedCount
        });
      }

      // === ADVANCED METRICS ===

      // SLA Compliance (tickets with due_date resolved before due_date)
      const ticketsWithDueDate = allTickets.filter(t => t.due_date);
      const resolvedWithinSLA = ticketsWithDueDate.filter(t => {
        if (t.status !== 'resolved' && t.status !== 'closed') return false;
        if (!t.resolved_at) return false;
        return isBefore(parseISO(t.resolved_at), parseISO(t.due_date!));
      }).length;
      const slaCompliance = ticketsWithDueDate.length > 0 
        ? Math.round((resolvedWithinSLA / ticketsWithDueDate.length) * 100) 
        : 100;

      // Overdue tickets (open/in_progress with due_date in the past)
      const overdueTickets = allTickets.filter(t => {
        if (t.status === 'resolved' || t.status === 'closed') return false;
        if (!t.due_date) return false;
        return isBefore(parseISO(t.due_date), now);
      }).length;

      // Urgent tickets (due in next 24 hours)
      const urgentTickets = allTickets
        .filter(t => {
          if (t.status === 'resolved' || t.status === 'closed') return false;
          if (!t.due_date) return false;
          const dueDate = parseISO(t.due_date);
          const hoursUntilDue = differenceInHours(dueDate, now);
          return hoursUntilDue > 0 && hoursUntilDue <= 24;
        })
        .map(t => ({
          id: t.id,
          ticket_number: t.ticket_number,
          title: t.title,
          due_date: t.due_date!,
          priority: t.priority,
          hoursRemaining: differenceInHours(parseISO(t.due_date!), now)
        }))
        .sort((a, b) => a.hoursRemaining - b.hoursRemaining);

      // Resolution time by category
      const categoryResolutionMap = new Map<string, { totalMinutes: number; count: number }>();
      resolvedWithTime.forEach(t => {
        const cat = t.category || 'other';
        const current = categoryResolutionMap.get(cat) || { totalMinutes: 0, count: 0 };
        const minutes = differenceInMinutes(parseISO(t.resolved_at!), parseISO(t.created_at!));
        current.totalMinutes += minutes;
        current.count++;
        categoryResolutionMap.set(cat, current);
      });
      const resolutionByCategory = Array.from(categoryResolutionMap.entries()).map(([category, data]) => ({
        category,
        label: getCategoryLabel(category),
        avgMinutes: Math.round(data.totalMinutes / data.count),
        count: data.count
      })).sort((a, b) => b.count - a.count);

      // Monthly trend (last 6 months)
      const monthlyTrend: { month: string; created: number; resolved: number; avgResolutionMinutes: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = endOfMonth(subMonths(now, i));
        
        const createdInMonth = allTickets.filter(t => {
          const created = parseISO(t.created_at!);
          return isAfter(created, monthStart) && isBefore(created, monthEnd);
        });
        
        const resolvedInMonth = allTickets.filter(t => {
          if (!t.resolved_at) return false;
          const resolved = parseISO(t.resolved_at);
          return isAfter(resolved, monthStart) && isBefore(resolved, monthEnd);
        });
        
        // Calculate avg resolution for this month
        const resolvedWithTimeInMonth = resolvedInMonth.filter(t => t.created_at);
        let avgMinutes = 0;
        if (resolvedWithTimeInMonth.length > 0) {
          const total = resolvedWithTimeInMonth.reduce((sum, t) => {
            return sum + differenceInMinutes(parseISO(t.resolved_at!), parseISO(t.created_at!));
          }, 0);
          avgMinutes = Math.round(total / resolvedWithTimeInMonth.length);
        }
        
        monthlyTrend.push({
          month: format(monthStart, 'MMM/yy'),
          created: createdInMonth.length,
          resolved: resolvedInMonth.length,
          avgResolutionMinutes: avgMinutes
        });
      }

      return {
        totalTickets,
        openTickets,
        inProgressTickets,
        resolvedTickets,
        closedTickets,
        resolvedToday,
        createdToday,
        avgResolutionTimeMinutes,
        ticketsByCategory,
        ticketsByTechnician,
        ticketsByStatus,
        ticketsTrend,
        ticketsByPriority,
        // Advanced
        slaCompliance,
        overdueTickets,
        urgentTickets,
        resolutionByCategory,
        monthlyTrend
      };
    },
    refetchInterval: 60000 // Refresh every minute
  });
};

export const formatResolutionTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) {
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
};
