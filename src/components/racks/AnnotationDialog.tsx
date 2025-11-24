import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RackAnnotation {
  id?: string;
  rack_id: string;
  position_u: number;
  position_side: string;
  title: string;
  description?: string;
  annotation_type: string;
  priority: string;
  due_date?: string;
  color?: string;
}

interface AnnotationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rackId: string;
  maxU: number;
  annotation?: RackAnnotation;
  onSave: (annotation: Partial<RackAnnotation>) => void;
  isLoading?: boolean;
}

const ANNOTATION_TYPES = [
  { value: 'info', label: 'Informação', icon: 'ℹ️' },
  { value: 'note', label: 'Nota', icon: '📝' },
  { value: 'attention', label: 'Atenção', icon: '⚠️' },
  { value: 'warning', label: 'Aviso', icon: '🚨' },
  { value: 'maintenance', label: 'Manutenção', icon: '🔧' },
];

const PRIORITIES = [
  { value: 'low', label: 'Baixa', color: '#3b82f6' },
  { value: 'medium', label: 'Média', color: '#eab308' },
  { value: 'high', label: 'Alta', color: '#f97316' },
  { value: 'critical', label: 'Crítica', color: '#ef4444' },
];

const POSITION_SIDES = [
  { value: 'front', label: 'Frontal' },
  { value: 'rear', label: 'Traseira' },
  { value: 'left', label: 'Esquerda' },
  { value: 'right', label: 'Direita' },
];

export function AnnotationDialog({ 
  open, 
  onOpenChange, 
  rackId, 
  maxU,
  annotation, 
  onSave,
  isLoading 
}: AnnotationDialogProps) {
  const [formData, setFormData] = useState<Partial<RackAnnotation>>({
    rack_id: rackId,
    position_u: 1,
    position_side: 'front',
    title: '',
    description: '',
    annotation_type: 'info',
    priority: 'medium',
    color: '#3b82f6',
  });
  
  const [dueDate, setDueDate] = useState<Date | undefined>();

  useEffect(() => {
    if (annotation) {
      setFormData({
        ...annotation,
        rack_id: rackId
      });
      if (annotation.due_date) {
        setDueDate(new Date(annotation.due_date));
      }
    } else {
      setFormData({
        rack_id: rackId,
        position_u: 1,
        position_side: 'front',
        title: '',
        description: '',
        annotation_type: 'info',
        priority: 'medium',
        color: '#3b82f6',
      });
      setDueDate(undefined);
    }
  }, [annotation, rackId, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      due_date: dueDate ? dueDate.toISOString() : undefined,
    };
    
    onSave(submitData);
  };

  const handlePriorityChange = (priority: string) => {
    const selectedPriority = PRIORITIES.find(p => p.value === priority);
    setFormData({
      ...formData,
      priority,
      color: selectedPriority?.color || formData.color
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {annotation ? 'Editar Anotação' : 'Nova Anotação'}
          </DialogTitle>
          <DialogDescription>
            Adicione notas, avisos ou lembretes de manutenção no rack 3D
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Manutenção programada"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="annotation_type">Tipo *</Label>
              <Select
                value={formData.annotation_type}
                onValueChange={(value) => setFormData({ ...formData, annotation_type: value })}
              >
                <SelectTrigger id="annotation_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANNOTATION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <span className="flex items-center gap-2">
                        <span>{type.icon}</span>
                        <span>{type.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detalhes adicionais sobre a anotação..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="position_u">Posição U *</Label>
              <Input
                id="position_u"
                type="number"
                min={1}
                max={maxU}
                value={formData.position_u}
                onChange={(e) => setFormData({ ...formData, position_u: parseInt(e.target.value) })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="position_side">Lado</Label>
              <Select
                value={formData.position_side}
                onValueChange={(value) => setFormData({ ...formData, position_side: value })}
              >
                <SelectTrigger id="position_side">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POSITION_SIDES.map((side) => (
                    <SelectItem key={side.value} value={side.value}>
                      {side.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade *</Label>
              <Select
                value={formData.priority}
                onValueChange={handlePriorityChange}
              >
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((priority) => (
                    <SelectItem key={priority.value} value={priority.value}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: priority.color }}
                        />
                        <span>{priority.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Data de Vencimento (opcional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP", { locale: ptBR }) : "Selecione uma data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : annotation ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}