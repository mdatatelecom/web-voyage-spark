import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useBuildings } from '@/hooks/useBuildings';
import { useFloors } from '@/hooks/useFloors';
import { useRooms } from '@/hooks/useRooms';
import { useRacks } from '@/hooks/useRacks';
import { useEquipment } from '@/hooks/useEquipment';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ChevronLeft, Server, Network, HardDrive, Cable } from 'lucide-react';

interface EquipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EQUIPMENT_TYPES = [
  { value: 'switch', label: 'Switch', icon: Network },
  { value: 'router', label: 'Roteador', icon: Network },
  { value: 'server', label: 'Servidor', icon: Server },
  { value: 'patch_panel', label: 'Patch Panel', icon: Cable },
  { value: 'firewall', label: 'Firewall', icon: HardDrive },
  { value: 'storage', label: 'Storage', icon: HardDrive },
  { value: 'other', label: 'Outro', icon: Server }
];

const PORT_TEMPLATES: Record<string, Array<{ value: string; label: string; count: number }>> = {
  switch: [
    { value: 'switch_24_gigabit', label: '24 portas Gigabit Ethernet', count: 24 },
    { value: 'switch_48_gigabit', label: '48 portas Gigabit Ethernet', count: 48 },
    { value: 'switch_48_plus_4sfp', label: '48 portas Gigabit + 4 SFP+', count: 52 }
  ],
  router: [
    { value: 'router_4_gigabit', label: '4 portas Gigabit', count: 4 },
    { value: 'router_2_plus_2sfp', label: '2 portas Gigabit + 2 SFP', count: 4 }
  ],
  server: [
    { value: 'server_2_nics', label: '2 NICs', count: 2 },
    { value: 'server_4_nics', label: '4 NICs', count: 4 }
  ],
  patch_panel: [
    { value: 'patch_panel_24', label: '24 portas', count: 24 },
    { value: 'patch_panel_48', label: '48 portas', count: 48 }
  ]
};

export function EquipmentDialog({ open, onOpenChange }: EquipmentDialogProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    buildingId: '',
    floorId: '',
    roomId: '',
    rackId: '',
    positionStart: '',
    positionEnd: '',
    name: '',
    type: '',
    manufacturer: '',
    model: '',
    serialNumber: '',
    hostname: '',
    ipAddress: '',
    notes: '',
    portTemplate: ''
  });

  const { buildings } = useBuildings();
  const { floors } = useFloors(formData.buildingId);
  const { rooms } = useRooms(formData.floorId);
  const { racks } = useRacks(formData.roomId);
  const { createEquipment, isCreating } = useEquipment();

  const selectedRack = racks?.find(r => r.id === formData.rackId);
  const portTemplates = formData.type ? PORT_TEMPLATES[formData.type] || [] : [];
  const selectedTemplate = portTemplates.find(t => t.value === formData.portTemplate);

  const handleSubmit = () => {
    const sizeU = parseInt(formData.positionEnd) - parseInt(formData.positionStart) + 1;
    
    createEquipment({
      equipment: {
        name: formData.name,
        type: formData.type as any,
        rack_id: formData.rackId,
        position_u_start: parseInt(formData.positionStart),
        position_u_end: parseInt(formData.positionEnd),
        manufacturer: formData.manufacturer || undefined,
        model: formData.model || undefined,
        serial_number: formData.serialNumber || undefined,
        hostname: formData.hostname || undefined,
        ip_address: formData.ipAddress || undefined,
        notes: formData.notes || undefined
      },
      ports: {
        type: formData.portTemplate || 'custom',
        count: 0
      }
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setStep(1);
        setFormData({
          buildingId: '', floorId: '', roomId: '', rackId: '',
          positionStart: '', positionEnd: '', name: '', type: '',
          manufacturer: '', model: '', serialNumber: '', hostname: '',
          ipAddress: '', notes: '', portTemplate: ''
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Equipamento - Passo {step}/5</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded ${s <= step ? 'bg-primary' : 'bg-muted'}`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Prédio *</Label>
              <Select value={formData.buildingId} onValueChange={(v) => setFormData({ ...formData, buildingId: v, floorId: '', roomId: '', rackId: '' })}>
                <SelectTrigger><SelectValue placeholder="Selecione o prédio" /></SelectTrigger>
                <SelectContent>
                  {buildings?.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Andar *</Label>
              <Select value={formData.floorId} onValueChange={(v) => setFormData({ ...formData, floorId: v, roomId: '', rackId: '' })} disabled={!formData.buildingId}>
                <SelectTrigger><SelectValue placeholder="Selecione o andar" /></SelectTrigger>
                <SelectContent>
                  {floors?.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Sala *</Label>
              <Select value={formData.roomId} onValueChange={(v) => setFormData({ ...formData, roomId: v, rackId: '' })} disabled={!formData.floorId}>
                <SelectTrigger><SelectValue placeholder="Selecione a sala" /></SelectTrigger>
                <SelectContent>
                  {rooms?.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Rack *</Label>
              <Select value={formData.rackId} onValueChange={(v) => setFormData({ ...formData, rackId: v })} disabled={!formData.roomId}>
                <SelectTrigger><SelectValue placeholder="Selecione o rack" /></SelectTrigger>
                <SelectContent>
                  {racks?.map(r => <SelectItem key={r.id} value={r.id}>{r.name} ({r.availableUs}U disponíveis)</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {selectedRack && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>U Inicial *</Label>
                    <Input
                      type="number"
                      min="1"
                      max={selectedRack.size_u}
                      value={formData.positionStart}
                      onChange={(e) => setFormData({ ...formData, positionStart: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>U Final *</Label>
                    <Input
                      type="number"
                      min="1"
                      max={selectedRack.size_u}
                      value={formData.positionEnd}
                      onChange={(e) => setFormData({ ...formData, positionEnd: e.target.value })}
                    />
                  </div>
                </div>
                {formData.positionStart && formData.positionEnd && (
                  <Badge>
                    {parseInt(formData.positionEnd) - parseInt(formData.positionStart) + 1}U selecionadas
                    (U{formData.positionStart}-{formData.positionEnd})
                  </Badge>
                )}
              </>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label>Nome do Equipamento *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: SW-CORE-01"
              />
            </div>

            <div>
              <Label>Tipo de Equipamento *</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v, portTemplate: '' })}>
                <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2">
                        <t.icon className="w-4 h-4" />
                        {t.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fabricante</Label>
                <Input
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  placeholder="Ex: Cisco"
                />
              </div>
              <div>
                <Label>Modelo</Label>
                <Input
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="Ex: Catalyst 9300"
                />
              </div>
            </div>

            <div>
              <Label>Número de Série</Label>
              <Input
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <Label>Hostname</Label>
              <Input
                value={formData.hostname}
                onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
                placeholder="Ex: sw-core-01.infratrack.local"
              />
            </div>

            <div>
              <Label>Endereço IP</Label>
              <Input
                value={formData.ipAddress}
                onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                placeholder="Ex: 192.168.1.1"
              />
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-4">
                Com base no tipo de equipamento selecionado, vamos gerar as portas automaticamente.
              </p>
            </div>

            <div>
              <Label>Template de Portas</Label>
              <Select value={formData.portTemplate} onValueChange={(v) => setFormData({ ...formData, portTemplate: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione um template" /></SelectTrigger>
                <SelectContent>
                  {portTemplates.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                  <SelectItem value="none">Sem portas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedTemplate && (
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                <p className="font-medium text-primary">✅ {selectedTemplate.count} portas serão criadas</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Todas as portas terão status inicial: Disponível
                </p>
              </div>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">📍 Localização</p>
                <p className="text-sm">Rack {selectedRack?.name} | Posição U{formData.positionStart}-{formData.positionEnd}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">📦 Equipamento</p>
                <p className="text-sm">{formData.name} | {EQUIPMENT_TYPES.find(t => t.value === formData.type)?.label}</p>
                {formData.manufacturer && <p className="text-sm">{formData.manufacturer} {formData.model}</p>}
              </div>
              {(formData.hostname || formData.ipAddress) && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">🌐 Rede</p>
                  {formData.hostname && <p className="text-sm">Hostname: {formData.hostname}</p>}
                  {formData.ipAddress && <p className="text-sm">IP: {formData.ipAddress}</p>}
                </div>
              )}
              {selectedTemplate && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">🔌 Portas</p>
                  <p className="text-sm">{selectedTemplate.count} portas serão criadas</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setStep(s => s - 1)}
            disabled={step === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>

          {step < 5 ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={
                (step === 1 && (!formData.rackId || !formData.positionStart || !formData.positionEnd)) ||
                (step === 2 && (!formData.name || !formData.type))
              }
            >
              Próximo
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isCreating}>
              {isCreating ? 'Criando...' : 'Criar Equipamento'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
