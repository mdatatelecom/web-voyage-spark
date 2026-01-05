import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLandingScreenshots, LandingScreenshot } from '@/hooks/useLandingScreenshots';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  ArrowLeft,
  Upload,
  Image as ImageIcon,
  Trash2,
  Pencil,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  GripVertical,
  Plus,
  Loader2,
} from 'lucide-react';

const LandingScreenshots = () => {
  const navigate = useNavigate();
  const {
    screenshots,
    isLoading,
    uploadImage,
    createScreenshot,
    updateScreenshot,
    deleteScreenshot,
    reorderScreenshots,
  } = useLandingScreenshots();

  const [isUploading, setIsUploading] = useState(false);
  const [editingScreenshot, setEditingScreenshot] = useState<LandingScreenshot | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newScreenshot, setNewScreenshot] = useState({
    title: '',
    description: '',
    imageUrl: '',
  });
  const [showAddDialog, setShowAddDialog] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsUploading(true);
    try {
      const file = acceptedFiles[0];
      const url = await uploadImage.mutateAsync(file);
      setNewScreenshot(prev => ({ ...prev, imageUrl: url }));
      setShowAddDialog(true);
    } finally {
      setIsUploading(false);
    }
  }, [uploadImage]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/webp': ['.webp'],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  const handleAddScreenshot = async () => {
    if (!newScreenshot.title || !newScreenshot.imageUrl) return;

    await createScreenshot.mutateAsync({
      title: newScreenshot.title,
      description: newScreenshot.description || undefined,
      image_url: newScreenshot.imageUrl,
    });

    setNewScreenshot({ title: '', description: '', imageUrl: '' });
    setShowAddDialog(false);
  };

  const handleUpdateScreenshot = async () => {
    if (!editingScreenshot) return;

    await updateScreenshot.mutateAsync({
      id: editingScreenshot.id,
      title: editingScreenshot.title,
      description: editingScreenshot.description,
    });

    setEditingScreenshot(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteScreenshot.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const handleToggleActive = async (screenshot: LandingScreenshot) => {
    await updateScreenshot.mutateAsync({
      id: screenshot.id,
      is_active: !screenshot.is_active,
    });
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const newOrder = [...screenshots];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    await reorderScreenshots.mutateAsync(newOrder.map(s => s.id));
  };

  const handleMoveDown = async (index: number) => {
    if (index === screenshots.length - 1) return;
    const newOrder = [...screenshots];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    await reorderScreenshots.mutateAsync(newOrder.map(s => s.id));
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Screenshots da Landing Page</h1>
              <p className="text-muted-foreground">
                Gerencie as imagens exibidas no carousel da página inicial
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="text-sm">
            {screenshots.length} screenshot{screenshots.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Upload Zone */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload de Screenshot
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
                ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
            >
              <input {...getInputProps()} />
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Fazendo upload...</p>
                </div>
              ) : isDragActive ? (
                <div className="flex flex-col items-center gap-2">
                  <ImageIcon className="h-8 w-8 text-primary" />
                  <p className="text-sm text-primary">Solte a imagem aqui</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Plus className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Arraste uma imagem ou clique para selecionar
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG ou WebP até 5MB
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Screenshots Grid */}
        <div className="grid gap-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <Skeleton className="w-48 h-28 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : screenshots.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Nenhum screenshot adicionado ainda. Faça upload para começar.
                </p>
              </CardContent>
            </Card>
          ) : (
            screenshots.map((screenshot, index) => (
              <Card
                key={screenshot.id}
                className={`transition-opacity ${!screenshot.is_active ? 'opacity-50' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex gap-4 items-center">
                    {/* Drag Handle & Order */}
                    <div className="flex flex-col items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleMoveDown(index)}
                        disabled={index === screenshots.length - 1}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Thumbnail */}
                    <div className="w-48 h-28 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      <img
                        src={screenshot.image_url}
                        alt={screenshot.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{screenshot.title}</h3>
                        {!screenshot.is_active && (
                          <Badge variant="secondary" className="text-xs">Oculto</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {screenshot.description || 'Sem descrição'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Ordem: {index + 1}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleActive(screenshot)}
                        title={screenshot.is_active ? 'Ocultar' : 'Mostrar'}
                      >
                        {screenshot.is_active ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingScreenshot(screenshot)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(screenshot.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Screenshot</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {newScreenshot.imageUrl && (
              <div className="rounded-lg overflow-hidden bg-muted">
                <img
                  src={newScreenshot.imageUrl}
                  alt="Preview"
                  className="w-full h-32 object-cover"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={newScreenshot.title}
                onChange={e => setNewScreenshot(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Dashboard Principal"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={newScreenshot.description}
                onChange={e => setNewScreenshot(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição breve do screenshot"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddScreenshot}
              disabled={!newScreenshot.title || createScreenshot.isPending}
            >
              {createScreenshot.isPending ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingScreenshot} onOpenChange={() => setEditingScreenshot(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Screenshot</DialogTitle>
          </DialogHeader>
          {editingScreenshot && (
            <div className="space-y-4">
              <div className="rounded-lg overflow-hidden bg-muted">
                <img
                  src={editingScreenshot.image_url}
                  alt={editingScreenshot.title}
                  className="w-full h-32 object-cover"
                />
              </div>
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input
                  value={editingScreenshot.title}
                  onChange={e => setEditingScreenshot(prev => prev ? { ...prev, title: e.target.value } : null)}
                  placeholder="Ex: Dashboard Principal"
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={editingScreenshot.description || ''}
                  onChange={e => setEditingScreenshot(prev => prev ? { ...prev, description: e.target.value } : null)}
                  placeholder="Descrição breve do screenshot"
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Visível na Landing Page</Label>
                <Switch
                  checked={editingScreenshot.is_active}
                  onCheckedChange={checked => setEditingScreenshot(prev => prev ? { ...prev, is_active: checked } : null)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingScreenshot(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateScreenshot}
              disabled={!editingScreenshot?.title || updateScreenshot.isPending}
            >
              {updateScreenshot.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este screenshot? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteScreenshot.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default LandingScreenshots;
