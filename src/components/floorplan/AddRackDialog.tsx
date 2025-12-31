import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Server, Check } from 'lucide-react';

interface Rack {
  id: string;
  name: string;
  size_u: number;
  room_id: string;
  room?: {
    name: string;
  };
}

interface AddRackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableRacks: Rack[];
  existingRackIds: string[];
  onAddRack: (rackId: string) => void;
  isLoading?: boolean;
}

export const AddRackDialog: React.FC<AddRackDialogProps> = ({
  open,
  onOpenChange,
  availableRacks,
  existingRackIds,
  onAddRack,
  isLoading,
}) => {
  const [search, setSearch] = useState('');
  const [selectedRackId, setSelectedRackId] = useState<string | null>(null);
  
  const filteredRacks = availableRacks.filter(rack => {
    const matchesSearch = rack.name.toLowerCase().includes(search.toLowerCase());
    const notAlreadyAdded = !existingRackIds.includes(rack.id);
    return matchesSearch && notAlreadyAdded;
  });
  
  const handleAdd = () => {
    if (selectedRackId) {
      onAddRack(selectedRackId);
      setSelectedRackId(null);
      setSearch('');
      onOpenChange(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Adicionar Rack à Planta
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar rack..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          
          {/* Rack list */}
          <ScrollArea className="h-[300px] border rounded-md">
            {filteredRacks.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                {availableRacks.length === existingRackIds.length
                  ? 'Todos os racks já foram adicionados'
                  : 'Nenhum rack encontrado'}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredRacks.map((rack) => (
                  <button
                    key={rack.id}
                    onClick={() => setSelectedRackId(rack.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-md transition-colors ${
                      selectedRackId === rack.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Server className="h-5 w-5" />
                      <div className="text-left">
                        <div className="font-medium">{rack.name}</div>
                        <div className={`text-xs ${
                          selectedRackId === rack.id 
                            ? 'text-primary-foreground/70' 
                            : 'text-muted-foreground'
                        }`}>
                          {rack.size_u}U • {rack.room?.name || 'Sala não definida'}
                        </div>
                      </div>
                    </div>
                    {selectedRackId === rack.id && (
                      <Check className="h-5 w-5" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleAdd} 
            disabled={!selectedRackId || isLoading}
          >
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
