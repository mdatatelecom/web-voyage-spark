import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  MessageCircle, 
  Search, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Phone,
  Ticket,
  Send,
  Filter,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  TestTube,
  Bell,
  User,
  Users
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useWhatsAppHistory, useResendWhatsApp, WhatsAppHistoryFilters } from '@/hooks/useWhatsAppHistory';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

// Helper to format phone number for display
const formatPhoneDisplay = (phone: string): string => {
  // Remove non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Brazilian phone format: +55 11 97610-4665
  if (digits.length === 13 && digits.startsWith('55')) {
    const ddd = digits.slice(2, 4);
    const part1 = digits.slice(4, 9);
    const part2 = digits.slice(9);
    return `(${ddd}) ${part1}-${part2}`;
  }
  if (digits.length === 12 && digits.startsWith('55')) {
    const ddd = digits.slice(2, 4);
    const part1 = digits.slice(4, 8);
    const part2 = digits.slice(8);
    return `(${ddd}) ${part1}-${part2}`;
  }
  if (digits.length === 11) {
    const ddd = digits.slice(0, 2);
    const part1 = digits.slice(2, 7);
    const part2 = digits.slice(7);
    return `(${ddd}) ${part1}-${part2}`;
  }
  
  return phone;
};

const WhatsAppHistory = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { resend } = useResendWhatsApp();
  
  const [filters, setFilters] = useState<WhatsAppHistoryFilters>({
    status: 'all',
    messageType: 'all',
  });
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const { notifications, isLoading, error, refetch, stats } = useWhatsAppHistory(filters);

  const handleResend = async (id: string) => {
    setResendingId(id);
    try {
      await resend(id);
      toast({
        title: 'Mensagem reenviada',
        description: 'A mensagem foi reenviada com sucesso.',
      });
      refetch();
    } catch (err) {
      toast({
        title: 'Erro ao reenviar',
        description: 'Não foi possível reenviar a mensagem.',
        variant: 'destructive',
      });
    } finally {
      setResendingId(null);
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'sent':
        return (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Enviada
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Erro
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
      default:
        return <Badge variant="outline">{status || 'Desconhecido'}</Badge>;
    }
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'notification':
        return <Bell className="h-4 w-4 text-blue-500" />;
      case 'test':
        return <TestTube className="h-4 w-4 text-purple-500" />;
      case 'alert':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default:
        return <MessageCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getMessageTypeLabel = (type: string) => {
    switch (type) {
      case 'notification':
        return 'Notificação';
      case 'test':
        return 'Teste';
      case 'alert':
        return 'Alerta';
      case 'manual':
        return 'Manual';
      default:
        return type;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-green-500" />
              Histórico de Mensagens WhatsApp
            </h1>
            <p className="text-muted-foreground">
              Visualize e gerencie todas as mensagens enviadas via WhatsApp
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <MessageCircle className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Enviadas</p>
                  <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Erros</p>
                  <p className="text-2xl font-bold text-red-600">{stats.error}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Date Range - Start */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal">
                    {filters.startDate ? (
                      format(filters.startDate, 'dd/MM/yyyy', { locale: ptBR })
                    ) : (
                      <span className="text-muted-foreground">Data inicial</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.startDate}
                    onSelect={(date) => setFilters({ ...filters, startDate: date })}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>

              {/* Date Range - End */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal">
                    {filters.endDate ? (
                      format(filters.endDate, 'dd/MM/yyyy', { locale: ptBR })
                    ) : (
                      <span className="text-muted-foreground">Data final</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.endDate}
                    onSelect={(date) => setFilters({ ...filters, endDate: date })}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>

              {/* Status Filter */}
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value as WhatsAppHistoryFilters['status'] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="sent">Enviadas</SelectItem>
                  <SelectItem value="error">Com erro</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                </SelectContent>
              </Select>

              {/* Message Type Filter */}
              <Select
                value={filters.messageType}
                onValueChange={(value) => setFilters({ ...filters, messageType: value as WhatsAppHistoryFilters['messageType'] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="notification">Notificação</SelectItem>
                  <SelectItem value="test">Teste</SelectItem>
                  <SelectItem value="alert">Alerta</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>

              {/* Phone/Name Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar telefone ou nome..."
                  value={filters.phoneSearch || ''}
                  onChange={(e) => setFilters({ ...filters, phoneSearch: e.target.value })}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Clear Filters */}
            {(filters.startDate || filters.endDate || filters.status !== 'all' || filters.messageType !== 'all' || filters.phoneSearch) && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setFilters({ status: 'all', messageType: 'all' })}
              >
                Limpar filtros
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Messages Table */}
        <Card>
          <CardHeader>
            <CardTitle>Mensagens</CardTitle>
            <CardDescription>
              {notifications.length} mensagem(ns) encontrada(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8 text-muted-foreground">
                Erro ao carregar mensagens
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma mensagem encontrada
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Tipo</TableHead>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Chamado</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notifications.map((notification) => (
                      <>
                        <TableRow 
                          key={notification.id}
                          className={cn(
                            "cursor-pointer hover:bg-muted/50",
                            expandedRow === notification.id && "bg-muted/30"
                          )}
                          onClick={() => setExpandedRow(expandedRow === notification.id ? null : notification.id)}
                        >
                          <TableCell>
                            {getMessageTypeIcon(notification.message_type)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {notification.created_at 
                                  ? format(new Date(notification.created_at), 'dd/MM/yyyy', { locale: ptBR })
                                  : '-'
                                }
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {notification.created_at 
                                  ? format(new Date(notification.created_at), 'HH:mm:ss', { locale: ptBR })
                                  : '-'
                                }
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                {(notification.contact_avatar_url || notification.group_picture_url) ? (
                                  <AvatarImage 
                                    src={notification.contact_avatar_url || notification.group_picture_url || ''} 
                                    alt={notification.contact_name || notification.group_name || 'Avatar'}
                                  />
                                ) : null}
                                <AvatarFallback className="bg-muted">
                                  {notification.phone_number.includes('@g.us') ? (
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <User className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">
                                  {notification.group_name || notification.contact_name || 'Desconhecido'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {notification.phone_number.includes('@g.us') 
                                    ? 'Grupo WhatsApp' 
                                    : formatPhoneDisplay(notification.phone_number)
                                  }
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {notification.ticket ? (
                              <Button
                                variant="link"
                                className="p-0 h-auto text-left"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/tickets/${notification.ticket_id}`);
                                }}
                              >
                                <Ticket className="h-4 w-4 mr-1" />
                                {notification.ticket.ticket_number}
                              </Button>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(notification.status)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {notification.status === 'error' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleResend(notification.id);
                                  }}
                                  disabled={resendingId === notification.id}
                                >
                                  {resendingId === notification.id ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Send className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                              {expandedRow === notification.id ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                        {expandedRow === notification.id && (
                          <TableRow>
                            <TableCell colSpan={6} className="bg-muted/20">
                              <div className="p-4 space-y-3">
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground mb-1">Mensagem:</p>
                                  <p className="text-sm whitespace-pre-wrap bg-background p-3 rounded-md border">
                                    {notification.message_content}
                                  </p>
                                </div>
                                {notification.error_message && (
                                  <div>
                                    <p className="text-sm font-medium text-destructive mb-1">Erro:</p>
                                    <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                                      {notification.error_message}
                                    </p>
                                  </div>
                                )}
                                <div className="flex gap-4 text-xs text-muted-foreground">
                                  <span>Tipo: {getMessageTypeLabel(notification.message_type)}</span>
                                  {notification.external_id && (
                                    <span>ID Externo: {notification.external_id}</span>
                                  )}
                                  {notification.sent_at && (
                                    <span>
                                      Enviada em: {format(new Date(notification.sent_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
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

export default WhatsAppHistory;
