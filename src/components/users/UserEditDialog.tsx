import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useWhatsAppProfilePicture } from '@/hooks/useWhatsAppProfilePicture';
import { User, RefreshCw, Loader2, Zap, Clock, AlertCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UserEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email: string;
    full_name?: string;
    phone?: string;
    avatar_url?: string;
    avatar_updated_at?: string;
  } | null;
  onSave: (userId: string, data: { full_name: string; phone: string }) => Promise<void>;
}

export const UserEditDialog = ({ open, onOpenChange, user, onSave }: UserEditDialogProps) => {
  const queryClient = useQueryClient();
  const { fetchAndUpdateProfilePicture, isLoading: isFetchingPhoto } = useWhatsAppProfilePicture();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarUpdatedAt, setAvatarUpdatedAt] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setPhone(user.phone || '');
      setAvatarUrl(user.avatar_url || '');
      setAvatarUpdatedAt(user.avatar_updated_at || null);
    }
  }, [user]);

  const getCacheStatus = () => {
    if (!avatarUrl) return null;
    if (!avatarUpdatedAt) return { inCache: false, label: 'Sem data de atualização' };
    
    const lastUpdate = new Date(avatarUpdatedAt);
    const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceUpdate < 24) {
      return {
        inCache: true,
        label: `Em cache`,
        timeAgo: formatDistanceToNow(lastUpdate, { locale: ptBR, addSuffix: true })
      };
    }
    
    return { inCache: false, label: 'Cache expirado' };
  };

  const cacheStatus = getCacheStatus();

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      await onSave(user.id, { full_name: fullName, phone });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFetchWhatsAppPhoto = async (force: boolean = false) => {
    if (!user || !phone) return;

    const newAvatarUrl = await fetchAndUpdateProfilePicture(user.id, phone, force);
    if (newAvatarUrl) {
      setAvatarUrl(newAvatarUrl);
      setAvatarUpdatedAt(new Date().toISOString());
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
          <DialogDescription>
            Editar informações do usuário {user?.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={avatarUrl || undefined} alt={fullName || user?.email} />
              <AvatarFallback className="text-2xl bg-muted">
                {fullName ? fullName[0].toUpperCase() : <User className="h-8 w-8" />}
              </AvatarFallback>
            </Avatar>
            
            {/* Cache Status Indicator */}
            {cacheStatus && (
              <div className="flex items-center justify-center">
                {cacheStatus.inCache ? (
                  <Badge variant="secondary" className="gap-1">
                    <Clock className="h-3 w-3" />
                    Atualizado {cacheStatus.timeAgo}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
                    <AlertCircle className="h-3 w-3" />
                    {cacheStatus.label}
                  </Badge>
                )}
              </div>
            )}

            {phone && (
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFetchWhatsAppPhoto(false)}
                  disabled={isFetchingPhoto}
                >
                  {isFetchingPhoto ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Atualizar Foto
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFetchWhatsAppPhoto(true)}
                  disabled={isFetchingPhoto}
                  className="text-muted-foreground"
                  title="Ignora o cache de 24h"
                >
                  <Zap className="h-4 w-4 mr-1" />
                  Forçar
                </Button>
              </div>
            )}
            
            {!phone && (
              <p className="text-xs text-muted-foreground text-center">
                Adicione um telefone para buscar a foto do WhatsApp
              </p>
            )}
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editFullName">Nome Completo</Label>
              <Input
                id="editFullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="João Silva"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editPhone">Telefone</Label>
              <Input
                id="editPhone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="5511999999999"
              />
              <p className="text-xs text-muted-foreground">
                Formato: código do país + DDD + número (ex: 5511999999999)
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
