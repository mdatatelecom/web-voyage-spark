import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useBuildings } from '@/hooks/useBuildings';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface BuildingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buildingId?: string;
}

interface BuildingFormData {
  name: string;
  address?: string;
}

export const BuildingDialog = ({ open, onOpenChange, buildingId }: BuildingDialogProps) => {
  const { createBuilding, updateBuilding, isCreating, isUpdating } = useBuildings();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<BuildingFormData>();

  const { data: building } = useQuery({
    queryKey: ['building', buildingId],
    queryFn: async () => {
      if (!buildingId) return null;
      const { data } = await supabase
        .from('buildings')
        .select('*')
        .eq('id', buildingId)
        .single();
      return data;
    },
    enabled: !!buildingId,
  });

  useEffect(() => {
    if (building) {
      reset({
        name: building.name,
        address: building.address || '',
      });
    } else {
      reset({ name: '', address: '' });
    }
  }, [building, reset, open]);

  const onSubmit = (data: BuildingFormData) => {
    if (buildingId) {
      updateBuilding({ id: buildingId, ...data });
    } else {
      createBuilding(data);
    }
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{buildingId ? 'Editar Prédio' : 'Novo Prédio'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Prédio *</Label>
            <Input
              id="name"
              {...register('name', { 
                required: 'Nome é obrigatório',
                minLength: { value: 3, message: 'Nome deve ter no mínimo 3 caracteres' }
              })}
              placeholder="Ex: Prédio Principal"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Textarea
              id="address"
              {...register('address')}
              placeholder="Ex: Rua das Flores, 123 - Centro"
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
