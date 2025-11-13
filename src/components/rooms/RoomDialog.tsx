import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRooms } from '@/hooks/useRooms';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface RoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId?: string;
  floorId?: string;
}

interface RoomFormData {
  name: string;
  room_type?: string;
}

const ROOM_TYPES = [
  'Data Center',
  'Sala Técnica',
  'Sala de Comunicações',
  'Outro',
];

export const RoomDialog = ({ open, onOpenChange, roomId, floorId }: RoomDialogProps) => {
  const { createRoom, updateRoom, isCreating, isUpdating } = useRooms(floorId);
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<RoomFormData>();
  const roomType = watch('room_type');

  const { data: room } = useQuery({
    queryKey: ['room', roomId],
    queryFn: async () => {
      if (!roomId) return null;
      const { data } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();
      return data;
    },
    enabled: !!roomId,
  });

  useEffect(() => {
    if (room) {
      reset({
        name: room.name,
        room_type: room.room_type || undefined,
      });
    } else {
      reset({ name: '', room_type: undefined });
    }
  }, [room, reset, open]);

  const onSubmit = (data: RoomFormData) => {
    if (roomId) {
      updateRoom({ id: roomId, ...data });
    } else if (floorId) {
      createRoom({ ...data, floor_id: floorId });
    }
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{roomId ? 'Editar Sala' : 'Nova Sala'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Sala *</Label>
            <Input
              id="name"
              {...register('name', { 
                required: 'Nome é obrigatório',
              })}
              placeholder="Ex: Sala Técnica 201"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="room_type">Tipo de Sala</Label>
            <Select value={roomType} onValueChange={(value) => setValue('room_type', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um tipo" />
              </SelectTrigger>
              <SelectContent>
                {ROOM_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
