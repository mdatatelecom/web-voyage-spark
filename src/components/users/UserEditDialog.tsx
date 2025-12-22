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
import { useWhatsAppProfilePicture } from '@/hooks/useWhatsAppProfilePicture';
import { User, RefreshCw, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface UserEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email: string;
    full_name?: string;
    phone?: string;
    avatar_url?: string;
  } | null;
  onSave: (userId: string, data: { full_name: string; phone: string }) => Promise<void>;
}

export const UserEditDialog = ({ open, onOpenChange, user, onSave }: UserEditDialogProps) => {
  const queryClient = useQueryClient();
  const { fetchAndUpdateProfilePicture, isLoading: isFetchingPhoto } = useWhatsAppProfilePicture();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setPhone(user.phone || '');
      setAvatarUrl(user.avatar_url || '');
    }
  }, [user]);

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

  const handleFetchWhatsAppPhoto = async () => {
    if (!user || !phone) return;

    const newAvatarUrl = await fetchAndUpdateProfilePicture(user.id, phone);
    if (newAvatarUrl) {
      setAvatarUrl(newAvatarUrl);
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
            
            {phone && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleFetchWhatsAppPhoto}
                disabled={isFetchingPhoto}
              >
                {isFetchingPhoto ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Atualizar Foto do WhatsApp
              </Button>
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
