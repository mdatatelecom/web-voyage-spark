import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Trash2, RefreshCw, ImageIcon, FolderOpen, AlertTriangle } from 'lucide-react';
import { formatBytes } from '@/lib/image-utils';

interface OrphanImagesCleanupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface StorageFile {
  name: string;
  path: string;
  publicUrl: string;
  metadata?: {
    size?: number;
    mimetype?: string;
  };
}

export const OrphanImagesCleanup = ({ open, onOpenChange }: OrphanImagesCleanupProps) => {
  const queryClient = useQueryClient();
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  // Fetch all files from storage
  const { data: storageFiles, isLoading: loadingStorage, refetch: refetchStorage } = useQuery({
    queryKey: ['storage-files', 'port-locations'],
    queryFn: async () => {
      const allFiles: StorageFile[] = [];
      
      // List all folders (equipment IDs) in port-locations
      const { data: folders, error: foldersError } = await supabase.storage
        .from('public')
        .list('port-locations', { limit: 1000 });

      if (foldersError) throw foldersError;

      // For each folder, list files
      for (const folder of folders || []) {
        if (folder.id) {
          // It's a folder
          const { data: files, error: filesError } = await supabase.storage
            .from('public')
            .list(`port-locations/${folder.name}`, { limit: 1000 });

          if (!filesError && files) {
            for (const file of files) {
              if (!file.id) continue; // Skip if not a file
              
              const path = `port-locations/${folder.name}/${file.name}`;
              const { data: urlData } = supabase.storage.from('public').getPublicUrl(path);
              
              allFiles.push({
                name: file.name,
                path,
                publicUrl: urlData.publicUrl,
                metadata: file.metadata as StorageFile['metadata']
              });
            }
          }
        }
      }

      return allFiles;
    },
    enabled: open
  });

  // Fetch all linked URLs from ports
  const { data: linkedUrls, isLoading: loadingPorts } = useQuery({
    queryKey: ['port-image-urls'],
    queryFn: async () => {
      const { data: ports, error } = await supabase
        .from('ports')
        .select('notes')
        .not('notes', 'is', null);

      if (error) throw error;

      const urls = new Set<string>();
      
      for (const port of ports || []) {
        if (port.notes) {
          try {
            const notes = typeof port.notes === 'string' ? JSON.parse(port.notes) : port.notes;
            const imageUrl = notes.location_image_url || 
                            notes.locationPhotoUrl || 
                            notes.location_photo_url ||
                            notes.locationImageUrl;
            if (imageUrl) {
              urls.add(imageUrl);
            }
          } catch {
            // Invalid JSON, skip
          }
        }
      }

      return urls;
    },
    enabled: open
  });

  // Identify orphan files
  const orphanFiles = storageFiles?.filter(file => !linkedUrls?.has(file.publicUrl)) || [];

  // Calculate total size
  const totalOrphanSize = orphanFiles.reduce((sum, file) => sum + (file.metadata?.size || 0), 0);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (paths: string[]) => {
      const { error } = await supabase.storage.from('public').remove(paths);
      if (error) throw error;
      return paths.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} imagem(ns) órfã(s) removida(s)!`);
      setSelectedFiles(new Set());
      queryClient.invalidateQueries({ queryKey: ['storage-files'] });
      refetchStorage();
    },
    onError: (error: any) => {
      toast.error(`Erro ao remover: ${error.message}`);
    }
  });

  const handleSelectAll = () => {
    if (selectedFiles.size === orphanFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(orphanFiles.map(f => f.path)));
    }
  };

  const handleToggleFile = (path: string) => {
    const newSet = new Set(selectedFiles);
    if (newSet.has(path)) {
      newSet.delete(path);
    } else {
      newSet.add(path);
    }
    setSelectedFiles(newSet);
  };

  const handleDelete = () => {
    if (selectedFiles.size === 0) return;
    setConfirmDeleteOpen(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate(Array.from(selectedFiles));
    setConfirmDeleteOpen(false);
  };

  const isLoading = loadingStorage || loadingPorts;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              Limpeza de Imagens Órfãs
            </DialogTitle>
            <DialogDescription>
              Imagens que foram enviadas mas não estão vinculadas a nenhuma porta.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between py-2 border-b">
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="gap-1">
                <ImageIcon className="w-3 h-3" />
                {storageFiles?.length || 0} total no storage
              </Badge>
              <Badge variant={orphanFiles.length > 0 ? 'destructive' : 'secondary'} className="gap-1">
                <AlertTriangle className="w-3 h-3" />
                {orphanFiles.length} órfãs ({formatBytes(totalOrphanSize)})
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchStorage()}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : orphanFiles.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ImageIcon className="w-12 h-12 mb-3 opacity-50" />
              <p className="font-medium">Nenhuma imagem órfã encontrada!</p>
              <p className="text-sm">Todas as imagens estão vinculadas a portas.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 py-2">
                <Checkbox
                  checked={selectedFiles.size === orphanFiles.length && orphanFiles.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-muted-foreground">
                  {selectedFiles.size > 0 
                    ? `${selectedFiles.size} selecionada(s)` 
                    : 'Selecionar todas'}
                </span>
              </div>

              <ScrollArea className="flex-1 -mx-6 px-6" type="always">
                <div className="grid grid-cols-3 gap-3">
                  {orphanFiles.map((file) => {
                    const isSelected = selectedFiles.has(file.path);
                    const hasError = imageErrors.has(file.path);
                    
                    return (
                      <Card
                        key={file.path}
                        className={`relative overflow-hidden cursor-pointer transition-all ${
                          isSelected ? 'ring-2 ring-destructive' : 'hover:ring-1 ring-border'
                        }`}
                        onClick={() => handleToggleFile(file.path)}
                      >
                        <div className="aspect-video bg-muted">
                          {hasError ? (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-8 h-8 text-muted-foreground" />
                            </div>
                          ) : (
                            <img
                              src={file.publicUrl}
                              alt={file.name}
                              className="w-full h-full object-cover"
                              onError={() => setImageErrors(prev => new Set(prev).add(file.path))}
                            />
                          )}
                        </div>
                        
                        <div className="absolute top-2 left-2">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleFile(file.path)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        
                        <div className="p-2 text-xs">
                          <p className="truncate font-mono text-muted-foreground">{file.name}</p>
                          {file.metadata?.size && (
                            <p className="text-muted-foreground">{formatBytes(file.metadata.size)}</p>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </>
          )}

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={selectedFiles.size === 0 || deleteMutation.isPending}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {deleteMutation.isPending 
                ? 'Excluindo...' 
                : `Excluir ${selectedFiles.size > 0 ? selectedFiles.size : ''} Selecionadas`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedFiles.size} imagem(ns) órfã(s)?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
