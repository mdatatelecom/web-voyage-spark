import React, { useState } from 'react';
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
  Users,
  Terminal,
  Zap,
  BarChart3
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useWhatsAppHistory, useResendWhatsApp, WhatsAppHistoryFilters } from '@/hooks/useWhatsAppHistory';
import { useWhatsAppInteractions, InteractionFilters } from '@/hooks/useWhatsAppInteractions';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

// Helper to format phone number for display
const formatPhoneDisplay = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  
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
  const [interactionFilters, setInteractionFilters] = useState<InteractionFilters>({});
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('notifications');

  const { notifications, isLoading, error, refetch, stats } = useWhatsAppHistory(filters);
  const { 
    interactions, 
    isLoading: isLoadingInteractions, 
    refetch: refetchInteractions,
    stats: interactionStats 
  } = useWhatsAppInteractions(interactionFilters);

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

  const topCommands = Object.entries(interactionStats.commandCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-green-500" />
              Histórico WhatsApp
            </h1>
            <p className="text-muted-foreground">
              Mensagens enviadas e comandos recebidos
            </p>
          </div>
          <Button 
            onClick={() => {
              refetch();
              refetchInteractions();
            }} 
            variant="outline" 
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Notificações
            </TabsTrigger>
            <TabsTrigger value="interactions" className="flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              Interações
            </TabsTrigger>
          </TabsList>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
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
                          <React.Fragment key={notification.id}>
                            <TableRow 
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
                                    {(notification.contact_avatar_url || notification.group_picture_url) && (
                                      <AvatarImage 
                                        src={notification.contact_avatar_url || notification.group_picture_url || ''} 
                                        alt={notification.contact_name || notification.group_name || 'Avatar'}
                                      />
                                    )}
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
                                  <div className="flex items-center gap-1">
                                    <Ticket className="h-3 w-3" />
                                    <span className="text-sm">{notification.ticket.ticket_number}</span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                                  >
                                    <Ticket className="h-3 w-3 mr-1" />
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
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedRow(expandedRow === notification.id ? null : notification.id);
                                    }}
                                  >
                                    {expandedRow === notification.id ? (
                                      <ChevronUp className="h-4 w-4" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                  </Button>
                                  {notification.status === 'error' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={resendingId === notification.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleResend(notification.id);
                                      }}
                                    >
                                      {resendingId === notification.id ? (
                                        <RefreshCw className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Send className="h-3 w-3" />
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>

                            {/* Expanded row */}
                            {expandedRow === notification.id && (
                              <TableRow>
                                <TableCell colSpan={6} className="bg-muted/20">
                                  <div className="p-4 space-y-4">
                                    <div>
                                      <h4 className="font-medium text-sm mb-2">Conteúdo da Mensagem</h4>
                                      <pre className="text-sm bg-background p-3 rounded-md whitespace-pre-wrap">
                                        {notification.message_content}
                                      </pre>
                                    </div>
                                    {notification.error_message && (
                                      <div>
                                        <h4 className="font-medium text-sm mb-2 text-destructive">Erro</h4>
                                        <pre className="text-sm bg-destructive/10 text-destructive p-3 rounded-md whitespace-pre-wrap">
                                          {notification.error_message}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Interactions Tab */}
          <TabsContent value="interactions" className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Interações</p>
                      <p className="text-2xl font-bold">{interactionStats.total}</p>
                    </div>
                    <Terminal className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Sucesso</p>
                      <p className="text-2xl font-bold text-green-600">{interactionStats.success}</p>
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
                      <p className="text-2xl font-bold text-red-600">{interactionStats.error}</p>
                    </div>
                    <XCircle className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Tempo Médio</p>
                      <p className="text-2xl font-bold">{interactionStats.avgProcessingTime}ms</p>
                    </div>
                    <Zap className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Commands */}
            {topCommands.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Comandos Mais Usados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {topCommands.map(([cmd, count]) => (
                      <Badge key={cmd} variant="secondary" className="text-sm">
                        {cmd}: {count}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Filters */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="justify-start text-left font-normal">
                        {interactionFilters.startDate ? (
                          format(interactionFilters.startDate, 'dd/MM/yyyy', { locale: ptBR })
                        ) : (
                          <span className="text-muted-foreground">Data inicial</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={interactionFilters.startDate}
                        onSelect={(date) => setInteractionFilters({ ...interactionFilters, startDate: date })}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="justify-start text-left font-normal">
                        {interactionFilters.endDate ? (
                          format(interactionFilters.endDate, 'dd/MM/yyyy', { locale: ptBR })
                        ) : (
                          <span className="text-muted-foreground">Data final</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={interactionFilters.endDate}
                        onSelect={(date) => setInteractionFilters({ ...interactionFilters, endDate: date })}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>

                  <Select
                    value={interactionFilters.command || 'all'}
                    onValueChange={(value) => setInteractionFilters({ ...interactionFilters, command: value === 'all' ? undefined : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Comando" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os comandos</SelectItem>
                      <SelectItem value="help">help</SelectItem>
                      <SelectItem value="status">status</SelectItem>
                      <SelectItem value="list">list</SelectItem>
                      <SelectItem value="novo">novo</SelectItem>
                      <SelectItem value="racks">racks</SelectItem>
                      <SelectItem value="cameras">cameras</SelectItem>
                      <SelectItem value="nvrs">nvrs</SelectItem>
                      <SelectItem value="localizar">localizar</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar telefone..."
                      value={interactionFilters.phoneSearch || ''}
                      onChange={(e) => setInteractionFilters({ ...interactionFilters, phoneSearch: e.target.value })}
                      className="pl-9"
                    />
                  </div>
                </div>

                {(interactionFilters.startDate || interactionFilters.endDate || interactionFilters.command || interactionFilters.phoneSearch) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => setInteractionFilters({})}
                  >
                    Limpar filtros
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Interactions Table */}
            <Card>
              <CardHeader>
                <CardTitle>Interações</CardTitle>
                <CardDescription>
                  {interactions.length} interação(ões) encontrada(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingInteractions ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : interactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma interação encontrada
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data/Hora</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead>Comando</TableHead>
                          <TableHead>Mensagem</TableHead>
                          <TableHead>Tempo</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {interactions.map((interaction) => (
                          <TableRow key={interaction.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {format(new Date(interaction.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(interaction.created_at), 'HH:mm:ss', { locale: ptBR })}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {interaction.is_group ? (
                                  <Users className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                )}
                                <span className="text-sm">
                                  {formatPhoneDisplay(interaction.phone_number)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {interaction.command ? (
                                <Badge variant="outline" className="font-mono">
                                  {interaction.command}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[200px]">
                              <span className="text-sm truncate block" title={interaction.message_received}>
                                {interaction.message_received?.substring(0, 50)}
                                {(interaction.message_received?.length || 0) > 50 && '...'}
                              </span>
                            </TableCell>
                            <TableCell>
                              {interaction.processing_time_ms ? (
                                <span className={cn(
                                  "text-sm font-mono",
                                  interaction.processing_time_ms > 2000 && "text-orange-500",
                                  interaction.processing_time_ms > 5000 && "text-red-500"
                                )}>
                                  {interaction.processing_time_ms}ms
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {interaction.response_status === 'success' ? (
                                <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  OK
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Erro
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default WhatsAppHistory;
