import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUsers, UserRole } from '@/hooks/useUsers';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface UserRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UserRoleDialog = ({ open, onOpenChange }: UserRoleDialogProps) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('viewer');
  const [foundUserId, setFoundUserId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const { findUserByEmail, assignRole, isAssigning } = useUsers();

  const handleSearch = async () => {
    if (!email) {
      toast.error('Digite um email');
      return;
    }

    setSearching(true);
    try {
      const user = await findUserByEmail(email);
      if (user) {
        setFoundUserId(user.id);
        toast.success(`Usuário encontrado: ${user.email}`);
      } else {
        toast.error('Usuário não encontrado');
        setFoundUserId(null);
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao buscar usuário');
      setFoundUserId(null);
    } finally {
      setSearching(false);
    }
  };

  const handleAssign = () => {
    if (!foundUserId) {
      toast.error('Busque um usuário primeiro');
      return;
    }

    assignRole(
      { userId: foundUserId, role },
      {
        onSuccess: () => {
          setEmail('');
          setFoundUserId(null);
          setRole('viewer');
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atribuir Role a Usuário</DialogTitle>
          <DialogDescription>
            Busque um usuário por email e atribua uma role
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email do Usuário</Label>
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                placeholder="usuario@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={searching}>
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer (Visualizador)</SelectItem>
                <SelectItem value="technician">Technician (Técnico)</SelectItem>
                <SelectItem value="admin">Admin (Administrador)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleAssign} disabled={!foundUserId || isAssigning}>
            {isAssigning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Atribuir Role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
