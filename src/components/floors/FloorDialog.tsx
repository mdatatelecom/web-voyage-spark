import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useFloors } from '@/hooks/useFloors';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FloorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  floorId?: string;
  buildingId?: string;
}

interface FloorFormData {
  name: string;
  floor_number?: number;
  area_sqm?: number;
  has_access_control?: boolean;
  notes?: string;
}

export const FloorDialog = ({ open, onOpenChange, floorId, buildingId }: FloorDialogProps) => {
  const { createFloor, updateFloor, isCreating, isUpdating } = useFloors(buildingId);
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FloorFormData>();
  
  const hasAccessControl = watch('has_access_control');

  const { data: floor } = useQuery({
    queryKey: ['floor', floorId],
    queryFn: async () => {
      if (!floorId) return null;
      const { data } = await supabase
        .from('floors')
        .select('*')
        .eq('id', floorId)
        .single();
      return data;
    },
    enabled: !!floorId,
  });

  useEffect(() => {
    if (floor) {
      reset({
        name: floor.name,
        floor_number: floor.floor_number || undefined,
        area_sqm: floor.area_sqm || undefined,
        has_access_control: floor.has_access_control || false,
        notes: '',
      });
    } else {
      reset({ 
        name: '', 
        floor_number: undefined,
        area_sqm: undefined,
        has_access_control: false,
        notes: '',
      });
    }
  }, [floor, reset, open]);

  const onSubmit = (data: FloorFormData) => {
    const formData = {
      ...data,
      floor_number: data.floor_number ? Number(data.floor_number) : undefined,
      area_sqm: data.area_sqm ? Number(data.area_sqm) : undefined,
      has_access_control: data.has_access_control || false,
    };

    if (floorId) {
      updateFloor({ id: floorId, ...formData });
    } else if (buildingId) {
      createFloor({ ...formData, building_id: buildingId });
    }
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{floorId ? 'Editar Andar' : 'Novo Andar'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Andar *</Label>
            <Input
              id="name"
              {...register('name', { 
                required: 'Nome é obrigatório',
              })}
              placeholder="Ex: 2º Andar, Térreo, Subsolo"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="floor_number">Número do Andar</Label>
            <Input
              id="floor_number"
              type="number"
              {...register('floor_number')}
              placeholder="Ex: 2, 0, -1"
            />
            <p className="text-xs text-muted-foreground">
              Números negativos para subsolos (ex: -1 para Subsolo 1)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="area_sqm">Área útil (m²)</Label>
            <Input
              id="area_sqm"
              type="number"
              step="0.01"
              {...register('area_sqm')}
              placeholder="Ex: 150.5"
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
              placeholder="Informações adicionais sobre o andar"
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
