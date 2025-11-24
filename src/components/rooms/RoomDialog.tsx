import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useRooms } from '@/hooks/useRooms';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ROOM_TYPES, ROOM_CATEGORIES } from '@/constants/locationTypes';

interface RoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId?: string;
  floorId?: string;
}

interface RoomFormData {
  name: string;
  room_type?: string;
  capacity?: number;
  has_access_control?: boolean;
  notes?: string;
}

export const RoomDialog = ({ open, onOpenChange, roomId, floorId }: RoomDialogProps) => {
  const { createRoom, updateRoom, isCreating, isUpdating } = useRooms(floorId);
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<RoomFormData>();
  
  const roomType = watch('room_type');
  const hasAccessControl = watch('has_access_control');

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
        capacity: room.capacity || undefined,
        has_access_control: room.has_access_control || false,
        notes: '',
      });
    } else {
      reset({ 
        name: '', 
        room_type: undefined,
        capacity: undefined,
        has_access_control: false,
        notes: '',
      });
    }
  }, [room, reset, open]);

  const onSubmit = (data: RoomFormData) => {
    const formData = {
      ...data,
      capacity: data.capacity ? Number(data.capacity) : undefined,
      has_access_control: data.has_access_control || false,
    };

    if (roomId) {
      updateRoom({ id: roomId, ...formData });
    } else if (floorId) {
      createRoom({ ...formData, floor_id: floorId });
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
              <SelectContent className="max-h-[300px]">
                {ROOM_CATEGORIES.map((category) => (
                  <div key={category}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      {category}
                    </div>
                    {ROOM_TYPES.filter(type => type.category === category).map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="capacity">Capacidade (opcional)</Label>
            <Input
              id="capacity"
              type="number"
              {...register('capacity')}
              placeholder="Número de pessoas/equipamentos"
            />
          </div>

          <div className="flex items-center justify-between space-y-2">
            <div className="space-y-0.5">
              <Label htmlFor="has_access_control">Acesso Controlado</Label>
              <p className="text-xs text-muted-foreground">
                Requer autorização para acesso
              </p>
            </div>
            <Switch
              id="has_access_control"
              checked={hasAccessControl}
              onCheckedChange={(checked) => setValue('has_access_control', checked)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Informações adicionais sobre a sala"
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
