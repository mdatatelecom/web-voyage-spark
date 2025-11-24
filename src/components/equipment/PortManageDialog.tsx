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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { PORT_TYPES, PORT_TYPE_CATEGORIES } from '@/constants/equipmentTypes';

interface PortManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipmentId: string;
  port?: any;
}

export const PortManageDialog = ({ open, onOpenChange, equipmentId, port }: PortManageDialogProps) => {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  // Single port form
  const [name, setName] = useState(port?.name || '');
  const [portNumber, setPortNumber] = useState(port?.port_number?.toString() || '');
  const [portType, setPortType] = useState(port?.port_type || 'rj45');
  const [speed, setSpeed] = useState(port?.speed || '');
  const [notes, setNotes] = useState(port?.notes || '');
  const [status, setStatus] = useState(port?.status || 'available');

  // Batch form
  const [prefix, setPrefix] = useState('');
  const [startNumber, setStartNumber] = useState('1');
  const [quantity, setQuantity] = useState('24');
  const [batchPortType, setBatchPortType] = useState('rj45');
  const [batchSpeed, setBatchSpeed] = useState('1Gbps');

  const selectedPortType = PORT_TYPES.find(pt => pt.value === portType);
  const batchSelectedPortType = PORT_TYPES.find(pt => pt.value === batchPortType);

  const handleSaveSingle = async () => {
    setLoading(true);
    try {
      if (port) {
        // Update existing port
        const { error } = await supabase
          .from('ports')
          .update({
            name,
            port_number: portNumber ? parseInt(portNumber) : null,
            port_type: portType,
            speed,
            notes,
            status,
          })
          .eq('id', port.id);

        if (error) throw error;

        await supabase.from('access_logs').insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          action: 'port_updated',
          details: { port_id: port.id, equipment_id: equipmentId },
        });

        toast.success('Porta atualizada com sucesso!');
      } else {
        // Create new port
        const { error } = await supabase
          .from('ports')
          .insert({
            equipment_id: equipmentId,
            name,
            port_number: portNumber ? parseInt(portNumber) : null,
            port_type: portType,
            speed,
            notes,
            status,
          });

        if (error) throw error;

        await supabase.from('access_logs').insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          action: 'port_created',
          details: { equipment_id: equipmentId },
        });

        toast.success('Porta criada com sucesso!');
      }

      queryClient.invalidateQueries({ queryKey: ['equipment', equipmentId] });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchCreate = async () => {
    setLoading(true);
    try {
      const start = parseInt(startNumber);
      const qty = parseInt(quantity);
      const ports = [];

      for (let i = 0; i < qty; i++) {
        const portNum = start + i;
        ports.push({
          equipment_id: equipmentId,
          name: `${prefix}${portNum}`,
          port_number: portNum,
          port_type: batchPortType,
          speed: batchSpeed,
          status: 'available',
        });
      }

      const { error } = await supabase.from('ports').insert(ports);

      if (error) throw error;

      await supabase.from('access_logs').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'port_created',
        details: { equipment_id: equipmentId, quantity: qty },
      });

      toast.success(`${qty} portas criadas com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['equipment', equipmentId] });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{port ? 'Editar Porta' : 'Adicionar Portas'}</DialogTitle>
          <DialogDescription>
            {port
              ? 'Atualize as informações da porta'
              : 'Adicione portas individualmente ou em lote'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={port ? 'single' : 'batch'} className="w-full">
          {!port && (
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single">Individual</TabsTrigger>
              <TabsTrigger value="batch">Em Lote</TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="single" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Porta *</Label>
              <Input
                id="name"
                placeholder="Ex: Gi1/0/1"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="portNumber">Número da Porta</Label>
              <Input
                id="portNumber"
                type="number"
                placeholder="1"
                value={portNumber}
                onChange={(e) => setPortNumber(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="portType">Tipo de Porta</Label>
              <Select value={portType} onValueChange={setPortType}>
                <SelectTrigger id="portType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PORT_TYPE_CATEGORIES.map(cat => (
                    <div key={cat.id}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        {cat.label}
                      </div>
                      {PORT_TYPES.filter(pt => pt.category === cat.id).map(pt => (
                        <SelectItem key={pt.value} value={pt.value}>
                          <div className="flex items-center gap-2">
                            <pt.icon className="w-3 h-3" />
                            {pt.label}
                          </div>
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="speed">Velocidade</Label>
              {selectedPortType?.speeds && selectedPortType.speeds.length > 0 ? (
                <Select value={speed} onValueChange={setSpeed}>
                  <SelectTrigger id="speed">
                    <SelectValue placeholder="Selecione a velocidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedPortType.speeds.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="speed"
                  placeholder="Ex: N/A"
                  value={speed}
                  onChange={(e) => setSpeed(e.target.value)}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Disponível</SelectItem>
                  <SelectItem value="reserved">Reservado</SelectItem>
                  <SelectItem value="faulty">Defeituoso</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                placeholder="Notas adicionais..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveSingle} disabled={loading || !name}>
                {port ? 'Atualizar' : 'Criar Porta'}
              </Button>
            </DialogFooter>
          </TabsContent>

          {!port && (
            <TabsContent value="batch" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prefix">Prefixo *</Label>
                <Input
                  id="prefix"
                  placeholder="Ex: Gi1/0/"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Será gerado: {prefix}1, {prefix}2, {prefix}3...
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startNumber">Número Inicial *</Label>
                  <Input
                    id="startNumber"
                    type="number"
                    value={startNumber}
                    onChange={(e) => setStartNumber(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantidade *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="batchPortType">Tipo de Porta</Label>
                <Select value={batchPortType} onValueChange={setBatchPortType}>
                  <SelectTrigger id="batchPortType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PORT_TYPE_CATEGORIES.map(cat => (
                      <div key={cat.id}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          {cat.label}
                        </div>
                        {PORT_TYPES.filter(pt => pt.category === cat.id).map(pt => (
                          <SelectItem key={pt.value} value={pt.value}>
                            <div className="flex items-center gap-2">
                              <pt.icon className="w-3 h-3" />
                              {pt.label}
                            </div>
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="batchSpeed">Velocidade</Label>
                {batchSelectedPortType?.speeds && batchSelectedPortType.speeds.length > 0 ? (
                  <Select value={batchSpeed} onValueChange={setBatchSpeed}>
                    <SelectTrigger id="batchSpeed">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {batchSelectedPortType.speeds.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="batchSpeed"
                    placeholder="Ex: N/A"
                    value={batchSpeed}
                    onChange={(e) => setBatchSpeed(e.target.value)}
                  />
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleBatchCreate}
                  disabled={loading || !prefix || !startNumber || !quantity}
                >
                  Criar {quantity} Portas
                </Button>
              </DialogFooter>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
