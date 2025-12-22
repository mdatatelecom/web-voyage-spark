import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
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
  Paperclip,
  Table as TableIcon,
  ExternalLink,
  Upload,
  Plus,
  X,
  Loader2,
  ZoomIn,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTicket, useTickets } from '@/hooks/useTickets';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { useTechnicians } from '@/hooks/useTechnicians';
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

// Image compression function
const compressImage = async (file: File): Promise<File> => {
  // Skip non-images and GIFs
  if (!file.type.startsWith('image/') || file.type === 'image/gif') {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      // Max dimensions
      const MAX_WIDTH = 1920;
      const MAX_HEIGHT = 1920;
      
      let { width, height } = img;
      
      // Calculate new dimensions
      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      
      canvas.width = width;
      canvas.height = height;
      
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            // Use compressed version only if smaller
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            // Keep original
            resolve(file);
          }
        },
        'image/jpeg',
        0.8 // 80% quality
      );
    };

    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
};

export default function TicketDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { ticket, comments, isLoading, commentsLoading, addComment, refetch } = useTicket(id!);
  const { updateTicket } = useTickets();
  const { sendTicketNotification, isEnabled: whatsAppEnabled } = useWhatsApp();
  const { technicians } = useTechnicians();
  
  const [newComment, setNewComment] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  
  // Lightbox state
  const [lightboxImage, setLightboxImage] = useState<{url: string, name: string} | null>(null);
  
  // Upload state
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Delete attachment state
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Handle file upload with compression
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || !ticket) return;
    setUploading(true);
    
    try {
      const newAttachments = [...((ticket.attachments as any[]) || [])];
      
      for (const file of Array.from(files)) {
        // Compress images before upload
        const processedFile = await compressImage(file);
        const fileName = `tickets/${ticket.id}/${Date.now()}-${processedFile.name}`;
        
        const { data, error } = await supabase.storage
          .from('public')
          .upload(fileName, processedFile);
        
        if (!error && data) {
          const { data: urlData } = supabase.storage.from('public').getPublicUrl(data.path);
          newAttachments.push({
            name: file.name,
            url: urlData.publicUrl,
            type: processedFile.type,
            size: processedFile.size,
            uploaded_at: new Date().toISOString()
          });
        } else {
          toast.error(`Erro ao fazer upload de ${file.name}`);
        }
      }
      
      await updateTicket.mutateAsync({
        id: ticket.id,
        attachments: newAttachments
      });
      
      refetch();
      toast.success('Anexo(s) adicionado(s) com sucesso');
    } catch (error) {
      toast.error('Erro ao adicionar anexos');
    } finally {
      setUploading(false);
    }
  };

  // Handle delete attachment
  const handleDeleteAttachment = async () => {
    if (deleteIndex === null || !ticket) return;
    setDeleting(true);
    
    try {
      const attachments = (ticket.attachments as any[]) || [];
      const attachment = attachments[deleteIndex];
      
      // Try to delete from storage (extract path from URL)
      if (attachment?.url) {
        const url = new URL(attachment.url);
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/(.+)/);
        if (pathMatch) {
          await supabase.storage.from('public').remove([pathMatch[1].replace('public/', '')]);
        }
      }
      
      // Remove from attachments array
      const newAttachments = attachments.filter((_, idx) => idx !== deleteIndex);
      
      await updateTicket.mutateAsync({
        id: ticket.id,
        attachments: newAttachments
      });
      
      refetch();
      toast.success('Anexo removido com sucesso');
    } catch (error) {
      toast.error('Erro ao remover anexo');
    } finally {
      setDeleting(false);
      setDeleteIndex(null);
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileUpload(e.dataTransfer.files);
  };

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

  const handleAssigneeChange = async (userId: string) => {
    if (!ticket) return;
    
    const assignedTo = userId === 'none' ? null : userId;
    const selectedTechnician = technicians?.find(t => t.id === userId);
    
    await updateTicket.mutateAsync({ 
      id: ticket.id, 
      assigned_to: assignedTo,
      technician_phone: selectedTechnician?.phone || null,
    });
    
    refetch();
  };

  const getAssigneeName = () => {
    if (!ticket?.assigned_to) return null;
    const tech = technicians?.find(t => t.id === ticket.assigned_to);
    return tech?.full_name || 'Sem nome';
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

            {/* Ticket Attachments with Drag-and-Drop */}
            <Card 
              className={cn(
                "relative transition-all",
                dragActive && "ring-2 ring-primary ring-dashed bg-primary/5"
              )}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
            >
              {/* Drop overlay */}
              {dragActive && (
                <div className="absolute inset-0 bg-primary/10 flex items-center justify-center z-10 rounded-lg">
                  <div className="text-center">
                    <Upload className="h-12 w-12 text-primary mx-auto" />
                    <p className="text-lg font-medium mt-2">Solte os arquivos aqui</p>
                  </div>
                </div>
              )}
              
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Paperclip className="h-5 w-5" />
                    Anexos do Chamado ({((ticket.attachments as any[]) || []).length})
                  </CardTitle>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => handleFileUpload(e.target.files)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar Anexo
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {((ticket.attachments as any[]) || []).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Upload className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>Nenhum anexo</p>
                    <p className="text-sm">Arraste arquivos aqui ou clique em "Adicionar Anexo"</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {((ticket.attachments as any[]) || []).map((attachment: any, idx: number) => {
                      const getFileIcon = (type: string) => {
                        if (type?.includes('pdf')) return <FileText className="h-8 w-8 text-red-500" />;
                        if (type?.includes('word') || type?.includes('document')) return <FileText className="h-8 w-8 text-blue-600" />;
                        if (type?.includes('excel') || type?.includes('spreadsheet')) return <TableIcon className="h-8 w-8 text-green-600" />;
                        return <FileIcon className="h-8 w-8 text-muted-foreground" />;
                      };

                      const formatFileSize = (bytes?: number) => {
                        if (!bytes) return '';
                        if (bytes < 1024) return `${bytes} B`;
                        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
                        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
                      };

                      const isImage = attachment.type?.startsWith('image/');
                      const isVideo = attachment.type?.startsWith('video/');
                      const isAudio = attachment.type?.startsWith('audio/');

                      return (
                        <div key={idx} className="relative group">
                          {/* Delete button */}
                          <button
                            onClick={() => setDeleteIndex(idx)}
                            className="absolute -top-2 -right-2 z-10 p-1.5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-destructive/90"
                            title="Remover anexo"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>

                          {isImage ? (
                            <button
                              onClick={() => setLightboxImage({ url: attachment.url, name: attachment.name })}
                              className="block relative overflow-hidden rounded-lg border hover:border-primary transition-colors w-full text-left cursor-zoom-in"
                            >
                              <img
                                src={attachment.url}
                                alt={attachment.name}
                                className="w-full h-32 object-cover group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 truncate">
                                {attachment.name}
                              </div>
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ZoomIn className="h-4 w-4 text-white drop-shadow-lg" />
                              </div>
                            </button>
                          ) : isVideo ? (
                            <div className="relative rounded-lg border overflow-hidden bg-black">
                              <video
                                src={attachment.url}
                                controls
                                preload="metadata"
                                className="w-full h-32 object-contain"
                              />
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 truncate pointer-events-none">
                                {attachment.name}
                              </div>
                            </div>
                          ) : isAudio ? (
                            <div className="flex flex-col p-4 border rounded-lg bg-muted/30 h-32 justify-center">
                              <div className="flex items-center gap-2 mb-2">
                                <Music className="h-5 w-5 text-blue-500 flex-shrink-0" />
                                <span className="text-xs font-medium truncate">{attachment.name}</span>
                              </div>
                              <audio
                                src={attachment.url}
                                controls
                                preload="metadata"
                                className="w-full h-8"
                              />
                              {attachment.size && (
                                <span className="text-xs text-muted-foreground mt-1 text-center">
                                  {formatFileSize(attachment.size)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <a
                              href={attachment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex flex-col items-center p-4 border rounded-lg hover:bg-muted hover:border-primary transition-colors h-32 justify-center"
                            >
                              {getFileIcon(attachment.type)}
                              <span className="text-xs mt-2 truncate w-full text-center font-medium">
                                {attachment.name}
                              </span>
                              {attachment.size && (
                                <span className="text-xs text-muted-foreground">
                                  {formatFileSize(attachment.size)}
                                </span>
                              )}
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
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
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    Atribuído a
                  </label>
                  <Select 
                    value={ticket.assigned_to || 'none'} 
                    onValueChange={handleAssigneeChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar técnico" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Não atribuído</SelectItem>
                      {technicians?.map((tech) => (
                        <SelectItem key={tech.id} value={tech.id}>
                          {tech.full_name || 'Sem nome'} ({tech.role === 'admin' ? 'Admin' : 'Técnico'})
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

                {ticket.assigned_to && (
                  <div className="flex items-center gap-3">
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">Técnico Responsável</div>
                      <div className="text-sm text-muted-foreground">
                        {getAssigneeName()}
                      </div>
                    </div>
                  </div>
                )}

                <Separator />

                {((ticket.attachments as any[]) || []).length > 0 && (
                  <div className="flex items-center gap-3">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">Anexos</div>
                      <div className="text-sm text-muted-foreground">
                        {((ticket.attachments as any[]) || []).length} arquivo(s) anexado(s)
                      </div>
                    </div>
                  </div>
                )}

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

      {/* Lightbox Modal */}
      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute right-4 top-4 z-20 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="relative flex items-center justify-center w-full h-full min-h-[60vh]">
            {lightboxImage && (
              <>
                <img
                  src={lightboxImage.url}
                  alt={lightboxImage.name}
                  className="max-w-full max-h-[85vh] object-contain"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                  <p className="font-medium text-white truncate mb-3">{lightboxImage.name}</p>
                  <div className="flex gap-3">
                    <Button size="sm" variant="secondary" asChild>
                      <a href={lightboxImage.url} download={lightboxImage.name}>
                        <Download className="h-4 w-4 mr-2" />
                        Baixar
                      </a>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <a href={lightboxImage.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Abrir em nova aba
                      </a>
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteIndex !== null} onOpenChange={() => setDeleteIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover anexo?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este anexo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAttachment}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removendo...
                </>
              ) : (
                'Remover'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
