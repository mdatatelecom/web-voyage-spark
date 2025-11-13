import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useRacks } from '@/hooks/useRacks';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface RackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rackId?: string;
  roomId?: string;
}

interface RackFormData {
  name: string;
  size_u?: number;
  notes?: string;
}

export const RackDialog = ({ open, onOpenChange, rackId, roomId }: RackDialogProps) => {
  const { createRack, updateRack, isCreating, isUpdating } = useRacks(roomId);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<RackFormData>();

  const { data: rack } = useQuery({
    queryKey: ['rack', rackId],
    queryFn: async () => {
      if (!rackId) return null;
      const { data } = await supabase
        .from('racks')
        .select('*')
        .eq('id', rackId)
        .single();
      return data;
    },
    enabled: !!rackId,
  });

  useEffect(() => {
    if (rack) {
      reset({
        name: rack.name,
        size_u: rack.size_u,
        notes: rack.notes || '',
      });
    } else {
      reset({ name: '', size_u: 42, notes: '' });
    }
  }, [rack, reset, open]);

  const onSubmit = (data: RackFormData) => {
    const formData = {
      ...data,
      size_u: data.size_u ? Number(data.size_u) : 42,
    };

    if (rackId) {
      updateRack({ id: rackId, ...formData });
    } else if (roomId) {
      createRack({ ...formData, room_id: roomId });
    }
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{rackId ? 'Editar Rack' : 'Novo Rack'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Rack *</Label>
            <Input
              id="name"
              {...register('name', { 
                required: 'Nome é obrigatório',
              })}
              placeholder="Ex: Rack A-01"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="size_u">Tamanho em U *</Label>
            <Input
              id="size_u"
              type="number"
              {...register('size_u', {
                required: 'Tamanho é obrigatório',
                min: { value: 1, message: 'Tamanho mínimo é 1U' },
                max: { value: 50, message: 'Tamanho máximo é 50U' },
              })}
              placeholder="42"
            />
            {errors.size_u && (
              <p className="text-sm text-destructive">{errors.size_u.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Valores comuns: 42U (padrão), 24U, 12U, 6U
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas/Observações</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Informações adicionais sobre o rack..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating || isUpdating}>
              {isCreating || isUpdating ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
