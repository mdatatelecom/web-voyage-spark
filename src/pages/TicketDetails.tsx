import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MessageSquare,
  Send,
  User,
  Building2,
  Package,
  Phone,
  MessageCircle,
  FileIcon,
  ImageIcon,
  Download,
  FileText,
  Music,
  Video,
} from 'lucide-react';
import { useTicket, useTickets } from '@/hooks/useTickets';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { WhatsAppButton } from '@/components/tickets/WhatsAppButton';
import {
  TICKET_STATUSES,
  TICKET_PRIORITIES,
  getCategoryLabel,
  getPriorityLabel,
  getStatusLabel,
  getStatusVariant,
} from '@/constants/ticketTypes';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

export default function TicketDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { ticket, comments, isLoading, commentsLoading, addComment } = useTicket(id!);
  const { updateTicket } = useTickets();
  const { sendTicketNotification, isEnabled: whatsAppEnabled } = useWhatsApp();
  
  const [newComment, setNewComment] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    if (!ticket) return;
    
    await updateTicket.mutateAsync({ id: ticket.id, status: newStatus });

    // Send WhatsApp notification if enabled and contact phone exists
    if (whatsAppEnabled && ticket.contact_phone) {
      await sendTicketNotification(
        ticket.contact_phone,
        ticket.ticket_number,
        ticket.title,
        newStatus,
        ticket.id
      );
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    if (!ticket) return;
    await updateTicket.mutateAsync({ id: ticket.id, priority: newPriority });
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    await addComment.mutateAsync({ comment: newComment, isInternal: isInternalComment });
    setNewComment('');
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-48" />
              <Skeleton className="h-64" />
            </div>
            <Skeleton className="h-96" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!ticket) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold">Chamado não encontrado</h2>
          <Button onClick={() => navigate('/tickets')} className="mt-4">
            Voltar para Chamados
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/tickets')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="font-mono text-lg font-bold">{ticket.ticket_number}</span>
              <Badge variant={getStatusVariant(ticket.status)}>
                {getStatusLabel(ticket.status)}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold mt-1">{ticket.title}</h1>
          </div>
          {whatsAppEnabled && ticket.contact_phone && (
            <WhatsAppButton
              phone={ticket.contact_phone}
              ticketNumber={ticket.ticket_number}
              ticketTitle={ticket.title}
              ticketId={ticket.id}
            />
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Descrição</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{ticket.description}</p>
              </CardContent>
            </Card>

            {/* Comments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Comentários ({comments?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {commentsLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                  </div>
                ) : comments?.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    Nenhum comentário ainda
                  </p>
                ) : (
                  comments?.map((comment) => {
                    const isWhatsApp = (comment as any).source === 'whatsapp';
                    const senderName = (comment as any).whatsapp_sender_name;
                    const senderPhone = (comment as any).whatsapp_sender_phone;
                    const attachments = (comment as any).attachments as Array<{
                      url: string;
                      type: string;
                      name: string;
                      size?: number;
                    }> | null;

                    const getAttachmentIcon = (type: string) => {
                      if (type.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
                      if (type.startsWith('video/')) return <Video className="h-4 w-4" />;
                      if (type.startsWith('audio/')) return <Music className="h-4 w-4" />;
                      if (type.includes('pdf')) return <FileText className="h-4 w-4" />;
                      return <FileIcon className="h-4 w-4" />;
                    };

                    const formatFileSize = (bytes?: number) => {
                      if (!bytes) return '';
                      if (bytes < 1024) return `${bytes} B`;
                      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
                      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
                    };
                    
                    return (
                      <div
                        key={comment.id}
                        className={`p-4 rounded-lg border ${
                          isWhatsApp
                            ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                            : comment.is_internal
                            ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
                            : 'bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {isWhatsApp ? (
                              <MessageCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <User className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="text-sm font-medium">
                              {isWhatsApp && senderName 
                                ? `${senderName}${senderPhone ? ` (${senderPhone})` : ''}`
                                : 'Usuário'}
                            </span>
                            {isWhatsApp && (
                              <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
                                WhatsApp
                              </Badge>
                            )}
                            {comment.is_internal && (
                              <Badge variant="outline" className="text-xs">
                                Interno
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(comment.created_at!), "dd/MM/yyyy HH:mm", {
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>
                        
                        {/* Attachments */}
                        {attachments && attachments.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {attachments.map((attachment, idx) => (
                              <div key={idx} className="flex flex-col gap-2">
                                {attachment.type.startsWith('image/') ? (
                                  <a
                                    href={attachment.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block"
                                  >
                                    <img
                                      src={attachment.url}
                                      alt={attachment.name}
                                      className="max-w-xs max-h-48 rounded-lg border border-border object-cover hover:opacity-90 transition-opacity"
                                    />
                                  </a>
                                ) : (
                                  <a
                                    href={attachment.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors max-w-xs"
                                  >
                                    {getAttachmentIcon(attachment.type)}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{attachment.name}</p>
                                      {attachment.size && (
                                        <p className="text-xs text-muted-foreground">
                                          {formatFileSize(attachment.size)}
                                        </p>
                                      )}
                                    </div>
                                    <Download className="h-4 w-4 text-muted-foreground" />
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

                <Separator />

                {/* Add Comment */}
                <div className="space-y-3">
                  <Textarea
                    placeholder="Adicionar comentário..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={isInternalComment}
                        onChange={(e) => setIsInternalComment(e.target.checked)}
                        className="rounded"
                      />
                      Comentário interno (não visível para o cliente)
                    </label>
                    <Button
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || addComment.isPending}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Enviar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Ações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={ticket.status} onValueChange={handleStatusChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TICKET_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Prioridade</label>
                  <Select value={ticket.priority} onValueChange={handlePriorityChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TICKET_PRIORITIES.map((priority) => (
                        <SelectItem key={priority.value} value={priority.value}>
                          {priority.icon} {priority.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Details */}
            <Card>
              <CardHeader>
                <CardTitle>Detalhes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Criado em</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(ticket.created_at!), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </div>
                  </div>
                </div>

                {ticket.updated_at && (
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">Última atualização</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(ticket.updated_at), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </div>
                    </div>
                  </div>
                )}

                <Separator />

                <div>
                  <div className="text-sm font-medium mb-1">Categoria</div>
                  <Badge variant="outline">{getCategoryLabel(ticket.category)}</Badge>
                </div>

                <div>
                  <div className="text-sm font-medium mb-1">Prioridade</div>
                  <Badge variant="secondary">{getPriorityLabel(ticket.priority)}</Badge>
                </div>

                {ticket.contact_phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">Telefone de Contato</div>
                      <div className="text-sm text-muted-foreground">{ticket.contact_phone}</div>
                    </div>
                  </div>
                )}

                {ticket.related_building_id && (
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">Local Relacionado</div>
                      <div className="text-sm text-muted-foreground">Ver detalhes</div>
                    </div>
                  </div>
                )}

                {ticket.related_equipment_id && (
                  <div className="flex items-center gap-3">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">Equipamento Relacionado</div>
                      <div className="text-sm text-muted-foreground">Ver detalhes</div>
                    </div>
                  </div>
                )}

                {ticket.due_date && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">Prazo</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(ticket.due_date), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
