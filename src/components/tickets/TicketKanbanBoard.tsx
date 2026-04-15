import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User as UserIcon, Paperclip } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getPriorityLabel, getStatusLabel } from '@/constants/ticketTypes';
import { useTicketCategories } from '@/hooks/useTicketCategories';
import { cn } from '@/lib/utils';

interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  assigned_to: string | null;
  assignee_name?: string | null;
  assignee_avatar_url?: string | null;
  created_at: string | null;
  attachments?: any;
}

interface TicketKanbanBoardProps {
  tickets: Ticket[];
  onStatusChange: (ticketId: string, newStatus: string) => void;
  onTicketClick: (id: string) => void;
}

const COLUMNS = [
  { status: 'open', label: 'Aberto', color: 'border-t-blue-500', bgHover: 'bg-blue-50 dark:bg-blue-950/30', headerBg: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200' },
  { status: 'in_progress', label: 'Em Andamento', color: 'border-t-yellow-500', bgHover: 'bg-yellow-50 dark:bg-yellow-950/30', headerBg: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200' },
  { status: 'resolved', label: 'Resolvido', color: 'border-t-green-500', bgHover: 'bg-green-50 dark:bg-green-950/30', headerBg: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200' },
  { status: 'closed', label: 'Fechado', color: 'border-t-gray-500', bgHover: 'bg-gray-50 dark:bg-gray-950/30', headerBg: 'bg-gray-100 dark:bg-gray-900/40 text-gray-800 dark:text-gray-200' },
];

const getPriorityBadgeVariant = (priority: string) => {
  switch (priority) {
    case 'critical': return 'destructive';
    case 'high': return 'default';
    case 'medium': return 'secondary';
    default: return 'outline';
  }
};

export function TicketKanbanBoard({ tickets, onStatusChange, onTicketClick }: TicketKanbanBoardProps) {
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const { getCategoryLabel } = useTicketCategories();

  const handleDragStart = (e: React.DragEvent, ticketId: string) => {
    e.dataTransfer.setData('ticketId', ticketId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    const ticketId = e.dataTransfer.getData('ticketId');
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket && ticket.status !== newStatus) {
      onStatusChange(ticketId, newStatus);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {COLUMNS.map(col => {
        const columnTickets = tickets.filter(t => t.status === col.status);
        const isDragOver = dragOverColumn === col.status;

        return (
          <div
            key={col.status}
            className={cn(
              'rounded-lg border border-t-4 min-h-[400px] flex flex-col transition-colors',
              col.color,
              isDragOver && col.bgHover
            )}
            onDragOver={(e) => handleDragOver(e, col.status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.status)}
          >
            <div className={cn('px-3 py-2 rounded-t-sm flex items-center justify-between', col.headerBg)}>
              <span className="font-semibold text-sm">{col.label}</span>
              <Badge variant="outline" className="text-xs">{columnTickets.length}</Badge>
            </div>

            <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[600px]">
              {columnTickets.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  Nenhum chamado
                </p>
              ) : (
                columnTickets.map(ticket => (
                  <Card
                    key={ticket.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, ticket.id)}
                    onClick={() => onTicketClick(ticket.id)}
                    className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-muted-foreground">{ticket.ticket_number}</span>
                        {ticket.attachments && (ticket.attachments as any[]).length > 0 && (
                          <Paperclip className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-sm font-medium line-clamp-2">{ticket.title}</p>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant={getPriorityBadgeVariant(ticket.priority) as any} className="text-[10px] px-1.5 py-0">
                          {getPriorityLabel(ticket.priority)}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {getCategoryLabel(ticket.category)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        {ticket.assignee_name ? (
                          <div className="flex items-center gap-1">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={ticket.assignee_avatar_url || undefined} />
                              <AvatarFallback className="text-[8px]">
                                <UserIcon className="h-3 w-3" />
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                              {ticket.assignee_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Sem atribuição</span>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {ticket.created_at && format(new Date(ticket.created_at), 'dd/MM', { locale: ptBR })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
