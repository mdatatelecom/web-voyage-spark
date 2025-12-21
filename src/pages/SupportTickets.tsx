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
import { Plus, Search, Ticket, Filter, Eye, User } from 'lucide-react';
import { useTickets } from '@/hooks/useTickets';
import { useAuth } from '@/hooks/useAuth';
import { TicketCreateDialog } from '@/components/tickets/TicketCreateDialog';
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  getCategoryLabel,
  getPriorityLabel,
  getStatusLabel,
  getStatusVariant,
} from '@/constants/ticketTypes';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function SupportTickets() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tickets, isLoading } = useTickets();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<string>('all');

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
      (assignmentFilter === 'unassigned' && !ticket.assigned_to);

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesAssignment;
  });

  const stats = {
    total: tickets?.length || 0,
    open: tickets?.filter((t) => t.status === 'open').length || 0,
    inProgress: tickets?.filter((t) => t.status === 'in_progress').length || 0,
    resolved: tickets?.filter((t) => t.status === 'resolved').length || 0,
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Ticket className="h-8 w-8" />
              Chamados
            </h1>
            <p className="text-muted-foreground">
              Gerencie os chamados de suporte técnico
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Chamado
          </Button>
        </div>

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
                Resolvidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                  {TICKET_CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tickets Table */}
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
                      <TableCell className="max-w-[300px] truncate">
                        {ticket.title}
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
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{ticket.assignee_name}</span>
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
      </div>

      <TicketCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </AppLayout>
  );
}
