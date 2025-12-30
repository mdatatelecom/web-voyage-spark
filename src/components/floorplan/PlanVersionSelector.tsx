import { useState } from 'react';
import { Check, ChevronDown, FileImage, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FloorPlan } from '@/hooks/useFloorPlans';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PlanVersionSelectorProps {
  floorPlans: FloorPlan[];
  activeId: string;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
  onRename?: (id: string, newName: string) => void;
  canEdit: boolean;
}

export function PlanVersionSelector({
  floorPlans,
  activeId,
  onSelect,
  onDelete,
  onRename,
  canEdit,
}: PlanVersionSelectorProps) {
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const activePlan = floorPlans.find(p => p.id === activeId);
  const activeIndex = floorPlans.findIndex(p => p.id === activeId);

  const handleRenameClick = (plan: FloorPlan) => {
    setRenameId(plan.id);
    setNewName(plan.name);
    setRenameDialogOpen(true);
  };

  const handleRenameConfirm = () => {
    if (renameId && newName.trim() && onRename) {
      onRename(renameId, newName.trim());
    }
    setRenameDialogOpen(false);
    setRenameId(null);
    setNewName('');
  };

  if (floorPlans.length <= 1) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <FileImage className="h-4 w-4" />
            <span className="hidden sm:inline">
              Versão {activeIndex + 1} de {floorPlans.length}
            </span>
            <span className="sm:hidden">
              {activeIndex + 1}/{floorPlans.length}
            </span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          {floorPlans.map((plan, index) => (
            <DropdownMenuItem
              key={plan.id}
              className="flex items-center justify-between gap-2 cursor-pointer"
              onClick={() => onSelect(plan.id)}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {plan.id === activeId ? (
                  <Check className="h-4 w-4 text-primary shrink-0" />
                ) : (
                  <div className="w-4" />
                )}
                <div className="flex flex-col min-w-0">
                  <span className="truncate font-medium">{plan.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(plan.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-1 shrink-0">
                {plan.is_active && (
                  <Badge variant="secondary" className="text-xs">
                    Ativa
                  </Badge>
                )}
                {canEdit && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRenameClick(plan);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    {floorPlans.length > 1 && onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(plan.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear Planta</DialogTitle>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome da planta"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleRenameConfirm();
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRenameConfirm}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
