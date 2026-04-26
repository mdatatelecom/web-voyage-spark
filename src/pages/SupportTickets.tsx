import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Ticket, Filter, Eye, User as UserIcon, Calendar, BarChart3, Paperclip, Settings, List, LayoutGrid, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useTickets } from '@/hooks/useTickets';
import { useAuth } from '@/hooks/useAuth';
import { useTicketCategories } from '@/hooks/useTicketCategories';
import { TicketCreateDialog } from '@/components/tickets/TicketCreateDialog';
import { TicketCategoryManager } from '@/components/tickets/TicketCategoryManager';
import { TicketKanbanBoard } from '@/components/tickets/TicketKanbanBoard';
import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  getPriorityLabel,
  getStatusLabel,
  getStatusVariant,
} from '@/constants/ticketTypes';
import { format, isToday, isAfter, subDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useUserRole } from '@/hooks/useUserRole';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export default function SupportTickets() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tickets, isLoading, updateTicket } = useTickets();
  const { activeCategories, getCategoryLabel } = useTicketCategories();
  const { isAdmin } = useUserRole();
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  const filteredTickets = tickets?.filter((ticket) => {
    const matchesSearch =
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    const matchesCategory = categoryFilter === 'all' || ticket.category === categoryFilter;
    
    const matchesAssignment = 
      assignmentFilter === 'all' ||
      (assignmentFilter === 'mine' && ticket.created_by === user?.id) ||
      (assignmentFilter === 'assigned_to_me' && ticket.assigned_to === user?.id) ||
      (assignmentFilter === 'unassigned' && !ticket.assigned_to) ||
      (assignmentFilter === 'my_resolved' && 
        (ticket.created_by === user?.id || ticket.assigned_to === user?.id) && 
        (ticket.status === 'resolved' || ticket.status === 'closed'));

    // Date filter
    const ticketDate = new Date(ticket.created_at!);
    const today = startOfDay(new Date());
    const matchesDate = 
      dateFilter === 'all' ||
      (dateFilter === 'today' && isToday(ticketDate)) ||
      (dateFilter === 'week' && isAfter(ticketDate, subDays(today, 7))) ||
      (dateFilter === 'month' && isAfter(ticketDate, subDays(today, 30)));

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesAssignment && matchesDate;
  });

  const stats = {
    total: tickets?.length || 0,
    open: tickets?.filter((t) => t.status === 'open').length || 0,
    inProgress: tickets?.filter((t) => t.status === 'in_progress').length || 0,
    resolved: tickets?.filter((t) => t.status === 'resolved' || t.status === 'closed').length || 0,
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <AppLayout>
      <Tabs defaultValue="tickets" className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Ticket className="h-8 w-8" />
              Chamados
            </h1>
            <TabsList>
              <TabsTrigger value="tickets">Chamados</TabsTrigger>
              {isAdmin && <TabsTrigger value="categories">Categorias</TabsTrigger>}
            </TabsList>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Abrir Chamado
          </Button>
        </div>

        <TabsContent value="tickets" className="space-y-6">

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Abertos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.open}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Em Andamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Finalizados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
              <p className="text-xs text-muted-foreground">Resolvidos + Fechados</p>
            </CardContent>
          </Card>
        </div>

        {/* View Toggle + Filters */}
        <div className="flex items-center justify-between">
          <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as 'list' | 'kanban')}>
            <ToggleGroupItem value="list" aria-label="Lista">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="kanban" aria-label="Kanban">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar chamados..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Atribuição" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="mine">📝 Criados por Mim</SelectItem>
                  <SelectItem value="assigned_to_me">👨‍🔧 Atribuídos a Mim</SelectItem>
                  <SelectItem value="my_resolved">✅ Meus Resolvidos</SelectItem>
                  <SelectItem value="unassigned">🔓 Não Atribuídos</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  {TICKET_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Prioridades</SelectItem>
                  {TICKET_PRIORITIES.map((priority) => (
                    <SelectItem key={priority.value} value={priority.value}>
                      {priority.icon} {priority.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Categorias</SelectItem>
                  {activeCategories.map((category) => (
                    <SelectItem key={category.slug} value={category.slug}>
                      {category.icon && `${category.icon} `}{category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Períodos</SelectItem>
                  <SelectItem value="today">📅 Hoje</SelectItem>
                  <SelectItem value="week">📆 Últimos 7 dias</SelectItem>
                  <SelectItem value="month">🗓️ Último mês</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tickets View */}
        {viewMode === 'kanban' ? (
          <TicketKanbanBoard
            tickets={filteredTickets || []}
            onStatusChange={(ticketId, newStatus) => {
              updateTicket.mutate({ id: ticketId, status: newStatus });
            }}
            onTicketClick={(id) => navigate(`/tickets/${id}`)}
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Atribuído a</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : filteredTickets?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Nenhum chamado encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTickets?.map((ticket) => (
                      <TableRow
                        key={ticket.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/tickets/${ticket.id}`)}
                      >
                        <TableCell className="font-mono font-medium">
                          {ticket.ticket_number}
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <div className="flex items-center gap-2">
                            <span className="truncate">{ticket.title}</span>
                            {ticket.attachments && (ticket.attachments as any[]).length > 0 && (
                              <Badge variant="outline" className="flex-shrink-0 gap-1 px-1.5 py-0.5">
                                <Paperclip className="h-3 w-3" />
                                <span className="text-xs">{(ticket.attachments as any[]).length}</span>
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getCategoryLabel(ticket.category)}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPriorityBadgeVariant(ticket.priority)}>
                            {getPriorityLabel(ticket.priority)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(ticket.status)}>
                            {getStatusLabel(ticket.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {ticket.assignee_name ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={ticket.assignee_avatar_url || undefined} alt={ticket.assignee_name} />
                                <AvatarFallback className="text-xs bg-muted">
                                  <UserIcon className="h-3 w-3" />
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate">{ticket.assignee_name}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic text-sm">
                              Não atribuído
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(ticket.created_at!), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/tickets/${ticket.id}`);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="categories">
            <TicketCategoryManager />
          </TabsContent>
        )}
      </Tabs>

      <TicketCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </AppLayout>
  );
}
