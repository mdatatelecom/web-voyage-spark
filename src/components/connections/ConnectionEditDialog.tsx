import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertCircle, Cable } from 'lucide-react';
import { CABLE_TYPES, CABLE_COLORS } from '@/constants/cables';
import { Database } from '@/integrations/supabase/types';

type CableType = Database['public']['Enums']['cable_type'];
type ConnectionStatus = Database['public']['Enums']['connection_status'];

interface ConnectionEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: any;
}

export function ConnectionEditDialog({ open, onOpenChange, connection }: ConnectionEditDialogProps) {
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    cableType: connection?.cable_type || '',
    cableLength: connection?.cable_length_meters?.toString() || '',
    cableColor: connection?.cable_color || '#3b82f6',
    status: connection?.status || 'active',
    notes: connection?.notes || ''
  });

  useEffect(() => {
    if (connection) {
      setFormData({
        cableType: connection.cable_type || '',
        cableLength: connection.cable_length_meters?.toString() || '',
        cableColor: connection.cable_color || '#3b82f6',
        status: connection.status || 'active',
        notes: connection.notes || ''
      });
    }
  }, [connection]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('connections')
        .update({
          cable_type: data.cableType,
          cable_length_meters: data.cableLength ? parseFloat(data.cableLength) : null,
          cable_color: data.cableColor,
          status: data.status,
          notes: data.notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', connection.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connection', connection.id] });
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      toast.success('Conexão atualizada com sucesso!');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    }
  });

  const handleSubmit = () => {
    if (!formData.cableType) {
      toast.error('Tipo de cabo é obrigatório');
      return;
    }
    updateMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cable className="w-5 h-5" />
            Editar Conexão - {connection?.connection_code}
          </DialogTitle>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            As portas não podem ser editadas. Para alterar portas, é necessário criar uma nova conexão.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <Label>Tipo de Cabo *</Label>
            <Select 
              value={formData.cableType} 
              onValueChange={(v: CableType) => setFormData({ ...formData, cableType: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de cabo" />
              </SelectTrigger>
              <SelectContent>
                {CABLE_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Comprimento (metros)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.cableLength}
              onChange={(e) => setFormData({ ...formData, cableLength: e.target.value })}
              placeholder="Ex: 5.5"
            />
          </div>

          <div>
            <Label>Cor do Cabo</Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {CABLE_COLORS.map(c => (
                <button
                  key={c.value}
                  onClick={() => setFormData({ ...formData, cableColor: c.value })}
                  className={`
                    h-10 rounded flex items-center justify-center text-sm font-medium
                    border-2 transition-all
                    ${formData.cableColor === c.value ? 'border-primary scale-105' : 'border-transparent'}
                  `}
                  style={{ backgroundColor: c.value, color: c.value === '#ffffff' ? '#000' : '#fff' }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={(v: ConnectionStatus) => setFormData({ ...formData, status: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">⚫ Ativo</SelectItem>
                <SelectItem value="testing">🟡 Testando</SelectItem>
                <SelectItem value="faulty">🔴 Defeituoso</SelectItem>
                <SelectItem value="reserved">🔵 Reservado</SelectItem>
                <SelectItem value="inactive">⚪ Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Adicione observações sobre esta conexão..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
