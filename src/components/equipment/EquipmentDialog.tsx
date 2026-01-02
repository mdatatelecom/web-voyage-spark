import { useState, useEffect } from 'react';
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
import { ChevronRight, ChevronLeft, X, Plus, Sparkles, Network } from 'lucide-react';
import { EQUIPMENT_CATEGORIES, PORT_TYPES, PORT_TYPE_CATEGORIES, getEquipmentFieldConfig, AIRFLOW_OPTIONS, EQUIPMENT_STATUS_OPTIONS } from '@/constants/equipmentTypes';
import { Cable, Info, Zap } from 'lucide-react';
import { MANUFACTURER_TEMPLATES, getTemplatesByManufacturer, getTemplateById } from '@/constants/manufacturerTemplates';
import { VlanSelector } from '@/components/ipam/VlanSelector';
import { IPSelector } from '@/components/ipam/IPSelector';

interface EquipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PortGroup {
  id: string;
  type: string;
  quantity: number;
  speed: string;
  prefix: string;
  startNumber: number;
}

export function EquipmentDialog({ open, onOpenChange }: EquipmentDialogProps) {
  const [step, setStep] = useState(0);
  const [useTemplate, setUseTemplate] = useState(false);
  const [selectedManufacturer, setSelectedManufacturer] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [portGroups, setPortGroups] = useState<PortGroup[]>([
    { id: '1', type: 'rj45', quantity: 24, speed: '1Gbps', prefix: 'Gi1/0/', startNumber: 1 }
  ]);
  
  const templatesByManufacturer = getTemplatesByManufacturer();
  
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
    ipRecordId: '', // ID do registro IP para reserva automática
    vlanUuid: '', // VLAN UUID for IP filtering
    notes: '',
    mountSide: 'front',
    // New fields inspired by NetBox
    assetTag: '',
    macAddress: '',
    powerConsumption: '',
    airflow: '',
    weightKg: '',
    equipmentStatus: 'active',
    // PoE fields
    poeBudget: ''
  });
  
  // Get field configuration based on selected equipment type
  const fieldConfig = getEquipmentFieldConfig(formData.type);

  const { buildings } = useBuildings();
  const { floors } = useFloors(formData.buildingId);
  const { rooms } = useRooms(formData.floorId);
  const { racks } = useRacks(formData.roomId);
  const { createEquipment, isCreating } = useEquipment();

  const selectedRack = racks?.find(r => r.id === formData.rackId);
  const categoryTypes = EQUIPMENT_CATEGORIES.find(c => c.id === selectedCategory)?.types || [];
  
  const totalPorts = portGroups.reduce((sum, g) => sum + g.quantity, 0);

  const addPortGroup = () => {
    setPortGroups([
      ...portGroups,
      { id: Date.now().toString(), type: 'rj45', quantity: 4, speed: '1Gbps', prefix: 'Port', startNumber: 1 }
    ]);
  };

  const removePortGroup = (id: string) => {
    setPortGroups(portGroups.filter(g => g.id !== id));
  };

  const updatePortGroup = (id: string, updates: Partial<PortGroup>) => {
    setPortGroups(portGroups.map(g => g.id === id ? { ...g, ...updates } : g));
  };
  
  const applyTemplate = (templateId: string) => {
    const template = getTemplateById(templateId);
    if (template) {
      setFormData(prev => ({
        ...prev,
        manufacturer: template.manufacturer,
        model: template.model,
        type: template.type,
        name: template.model,
        poeBudget: template.poeBudgetWatts?.toString() || ''
      }));
      setSelectedCategory(template.category);
      setPortGroups(template.portGroups.map((pg, idx) => ({
        id: (idx + 1).toString(),
        ...pg
      })));
    }
  };
  
  useEffect(() => {
    if (selectedTemplateId) {
      applyTemplate(selectedTemplateId);
    }
  }, [selectedTemplateId]);

  const handleSubmit = () => {
    // Only include portGroups if this equipment type supports ports
    const portsToCreate = fieldConfig.hasPorts ? portGroups : [];
    
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
        hostname: fieldConfig.fields.hostname ? formData.hostname || undefined : undefined,
        ip_address: fieldConfig.fields.ipAddress ? formData.ipAddress || undefined : undefined,
        notes: formData.notes || undefined,
        mount_side: formData.mountSide as any,
        // New fields
        asset_tag: fieldConfig.fields.assetTag ? formData.assetTag || undefined : undefined,
        primary_mac_address: fieldConfig.fields.macAddress ? formData.macAddress || undefined : undefined,
        power_consumption_watts: fieldConfig.fields.powerConsumption && formData.powerConsumption ? parseInt(formData.powerConsumption) : undefined,
        weight_kg: fieldConfig.fields.weight && formData.weightKg ? parseFloat(formData.weightKg) : undefined,
        airflow: fieldConfig.fields.airflow ? formData.airflow || undefined : undefined,
        equipment_status: formData.equipmentStatus || 'active',
        // PoE Budget
        poe_budget_watts: (formData.type === 'switch_poe' || formData.type === 'pdu_smart') && formData.poeBudget ? parseFloat(formData.poeBudget) : undefined
      },
      portGroups: portsToCreate,
      reserveIP: !!formData.ipRecordId,
      ipRecordId: formData.ipRecordId || undefined
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setStep(0);
        setUseTemplate(false);
        setSelectedManufacturer('');
        setSelectedTemplateId('');
        setSelectedCategory('');
        setPortGroups([{ id: '1', type: 'rj45', quantity: 24, speed: '1Gbps', prefix: 'Gi1/0/', startNumber: 1 }]);
        setFormData({
          buildingId: '', floorId: '', roomId: '', rackId: '',
          positionStart: '', positionEnd: '', name: '', type: '',
          manufacturer: '', model: '', serialNumber: '', hostname: '',
          ipAddress: '', ipRecordId: '', vlanUuid: '', notes: '', mountSide: 'front',
          assetTag: '', macAddress: '', powerConsumption: '', airflow: '',
          weightKg: '', equipmentStatus: 'active', poeBudget: ''
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 0 ? 'Usar Template?' : `Adicionar Equipamento - Passo ${step}/5`}
          </DialogTitle>
        </DialogHeader>

        {step > 0 && (
          <div className="flex gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-2 flex-1 rounded ${s <= step ? 'bg-primary' : 'bg-muted'}`}
              />
            ))}
          </div>
        )}

        {step === 0 && (
          <div className="space-y-6">
            <div className="text-center py-6">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold mb-2">Criar a partir de um Template?</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Templates incluem configurações pré-definidas de portas para equipamentos de fabricantes conhecidos
              </p>
              
              <div className="flex gap-3 justify-center">
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => {
                    setUseTemplate(false);
                    setStep(1);
                  }}
                >
                  Criar Manualmente
                </Button>
                <Button 
                  size="lg"
                  onClick={() => {
                    setUseTemplate(true);
                    setStep(1);
                  }}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Usar Template
                </Button>
              </div>
            </div>
            
            {useTemplate && (
              <div className="space-y-4 border-t pt-6">
                <div>
                  <Label>Fabricante</Label>
                  <Select value={selectedManufacturer} onValueChange={(v) => {
                    setSelectedManufacturer(v);
                    setSelectedTemplateId('');
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o fabricante" />
                    </SelectTrigger>
                    <SelectContent>
                      {templatesByManufacturer.map(({ manufacturer }) => (
                        <SelectItem key={manufacturer} value={manufacturer}>
                          {manufacturer}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedManufacturer && (
                  <div>
                    <Label>Modelo</Label>
                    <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o modelo" />
                      </SelectTrigger>
                      <SelectContent>
                        {templatesByManufacturer
                          .find(t => t.manufacturer === selectedManufacturer)
                          ?.models.map(template => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.model}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {selectedTemplateId && (
                  <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                    <p className="text-sm font-medium text-primary mb-2">✨ Template Selecionado</p>
                    <p className="text-xs text-muted-foreground">
                      As informações do equipamento e portas serão pré-preenchidas. Você poderá ajustá-las nos próximos passos.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

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
                <div>
                  <Label>Lado de Montagem *</Label>
                  <Select value={formData.mountSide} onValueChange={(v) => setFormData({ ...formData, mountSide: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="front">Frontal (Padrão)</SelectItem>
                      <SelectItem value="rear">Traseira</SelectItem>
                      <SelectItem value="both">Ambos os Lados</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.type === 'pdu' || formData.type === 'ups' ? 
                      '💡 PDU/UPS geralmente ficam na traseira' :
                      formData.type === 'switch' || formData.type === 'patch_panel' ?
                      '💡 Switches/Patch Panels ficam frontais' :
                      'Selecione onde o equipamento será instalado'
                    }
                  </p>
                </div>
                
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
              <Label>Categoria de Equipamento *</Label>
              <div className="grid grid-cols-4 gap-3 mt-2">
                {EQUIPMENT_CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setFormData({ ...formData, type: '' });
                      }}
                      className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                        selectedCategory === cat.id 
                          ? 'border-primary bg-primary/10' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                      <span className="text-xs font-medium text-center">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedCategory && (
              <div>
                <Label>Tipo de Equipamento *</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                  <SelectContent>
                    {categoryTypes.map(t => (
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
            )}

            <div>
              <Label>Nome do Equipamento *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: SW-CORE-01"
              />
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
            {/* Show message for passive equipment */}
            {!fieldConfig.hasNetwork && !fieldConfig.fields.assetTag && (
              <div className="p-4 bg-muted rounded-lg flex items-start gap-3">
                <Info className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Equipamento Passivo</p>
                  <p className="text-xs text-muted-foreground">
                    Este tipo de equipamento não possui configurações de rede ou identificação avançada.
                  </p>
                </div>
              </div>
            )}

            {/* Network fields - only for network-capable equipment */}
            {fieldConfig.hasNetwork && (
              <>
                {fieldConfig.fields.hostname && (
                  <div>
                    <Label>Hostname</Label>
                    <Input
                      value={formData.hostname}
                      onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
                      placeholder="Ex: sw-core-01.infratrack.local"
                    />
                  </div>
                )}

                {/* VLAN + IP Selection */}
                {fieldConfig.fields.ipAddress && (
                  <div className="p-4 border rounded-lg space-y-4 bg-muted/30">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Network className="w-4 h-4" />
                      Configuração de Rede
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>VLAN (opcional)</Label>
                        <VlanSelector
                          value={formData.vlanUuid}
                          onChange={(vlanId, vlanUuid) => setFormData({ 
                            ...formData, 
                            vlanUuid: vlanUuid || '',
                            ipAddress: '' // Clear IP when VLAN changes
                          })}
                          showCreateOption={false}
                          placeholder="Filtrar por VLAN"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Endereço IP</Label>
                        <IPSelector
                          value={formData.ipAddress}
                          onChange={(ip, ipId) => setFormData({ ...formData, ipAddress: ip, ipRecordId: ipId || '' })}
                          vlanUuid={formData.vlanUuid}
                          placeholder={formData.vlanUuid ? "Selecione um IP da VLAN" : "Selecione ou digite um IP"}
                          allowManual={true}
                        />
                      </div>
                    </div>
                    
                    {formData.vlanUuid && !formData.ipAddress && (
                      <p className="text-xs text-muted-foreground">
                        💡 Selecione um IP disponível na VLAN ou digite manualmente
                      </p>
                    )}
                  </div>
                )}

                {fieldConfig.fields.macAddress && (
                  <div>
                    <Label>MAC Address Principal</Label>
                    <Input
                      value={formData.macAddress}
                      onChange={(e) => setFormData({ ...formData, macAddress: e.target.value })}
                      placeholder="Ex: AA:BB:CC:DD:EE:FF"
                    />
                  </div>
                )}
              </>
            )}

            {/* Asset Tag - for equipment that supports it */}
            {fieldConfig.fields.assetTag && (
              <div>
                <Label>Tag de Patrimônio</Label>
                <Input
                  value={formData.assetTag}
                  onChange={(e) => setFormData({ ...formData, assetTag: e.target.value })}
                  placeholder="Ex: PAT-000001"
                />
              </div>
            )}

            {/* Power and Airflow fields */}
            <div className="grid grid-cols-2 gap-4">
              {fieldConfig.fields.powerConsumption && (
                <div>
                  <Label>Consumo de Energia (Watts)</Label>
                  <Input
                    type="number"
                    value={formData.powerConsumption}
                    onChange={(e) => setFormData({ ...formData, powerConsumption: e.target.value })}
                    placeholder="Ex: 500"
                  />
                </div>
              )}

              {fieldConfig.fields.weight && (
                <div>
                  <Label>Peso (kg)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.weightKg}
                    onChange={(e) => setFormData({ ...formData, weightKg: e.target.value })}
                    placeholder="Ex: 12.5"
                  />
                </div>
              )}
            </div>

            {fieldConfig.fields.airflow && (
              <div>
                <Label>Fluxo de Ar</Label>
                <Select value={formData.airflow} onValueChange={(v) => setFormData({ ...formData, airflow: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o fluxo de ar" />
                  </SelectTrigger>
                  <SelectContent>
                    {AIRFLOW_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* PoE Budget field - only for PoE switches and smart PDUs */}
            {(formData.type === 'switch_poe' || formData.type === 'pdu_smart') && (
              <div className="p-4 border rounded-lg bg-primary/5 border-primary/20">
                <Label className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  PoE Budget Total (Watts)
                </Label>
                <Input
                  type="number"
                  value={formData.poeBudget}
                  onChange={(e) => setFormData({ ...formData, poeBudget: e.target.value })}
                  placeholder="Ex: 370"
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  💡 Potência total disponível para alimentar dispositivos PoE conectados (câmeras IP, access points, etc.)
                </p>
              </div>
            )}

            <div>
              <Label>Observações</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            {/* Show message for equipment without ports */}
            {!fieldConfig.hasPorts && (
              <div className="text-center py-8 bg-muted rounded-lg">
                <Cable className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold">Sem Portas Configuráveis</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Equipamentos do tipo "{EQUIPMENT_CATEGORIES.flatMap(c => c.types).find(t => t.value === formData.type)?.label || formData.type}" não possuem portas configuráveis.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Exemplos: Organizadores de cabos, painéis de escova
                </p>
              </div>
            )}

            {fieldConfig.hasPorts && (
              <>
                <div className="flex items-center justify-between">
                  <Label className="text-base">🔌 Configuração de Portas</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addPortGroup}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Tipo de Porta
                  </Button>
                </div>

                <div className="space-y-3">
                  {portGroups.map((group, index) => {
                    const portType = PORT_TYPES.find(pt => pt.value === group.type);
                    return (
                      <div key={group.id} className="p-4 border rounded-lg space-y-3 bg-card">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Grupo {index + 1}</span>
                          {portGroups.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removePortGroup(group.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs">Tipo de Porta</Label>
                            <Select value={group.type} onValueChange={(v) => updatePortGroup(group.id, { type: v })}>
                              <SelectTrigger className="h-9">
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
                                          <span className="text-xs">{pt.label}</span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </div>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-xs">Quantidade</Label>
                            <Input
                              type="number"
                              min="1"
                              value={group.quantity}
                              onChange={(e) => updatePortGroup(group.id, { quantity: parseInt(e.target.value) || 1 })}
                              className="h-9"
                            />
                          </div>

                          <div>
                            <Label className="text-xs">Velocidade</Label>
                            {portType?.speeds && portType.speeds.length > 0 ? (
                              <Select value={group.speed} onValueChange={(v) => updatePortGroup(group.id, { speed: v })}>
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {portType.speeds.map(speed => (
                                    <SelectItem key={speed} value={speed}>{speed}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                value={group.speed}
                                onChange={(e) => updatePortGroup(group.id, { speed: e.target.value })}
                                placeholder="Ex: N/A"
                                className="h-9"
                              />
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Prefixo do Nome</Label>
                            <Input
                              value={group.prefix}
                              onChange={(e) => updatePortGroup(group.id, { prefix: e.target.value })}
                              placeholder="Ex: Gi1/0/"
                              className="h-9"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Número Inicial</Label>
                            <Input
                              type="number"
                              min="0"
                              value={group.startNumber}
                              onChange={(e) => updatePortGroup(group.id, { startNumber: parseInt(e.target.value) || 0 })}
                              className="h-9"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="font-medium text-primary">📊 RESUMO: {totalPorts} portas serão criadas</p>
                  <div className="mt-2 space-y-1">
                    {portGroups.map((group, index) => {
                      const portType = PORT_TYPES.find(pt => pt.value === group.type);
                      return (
                        <p key={group.id} className="text-sm text-muted-foreground">
                          • {group.quantity}x {portType?.label} ({group.speed})
                        </p>
                      );
                    })}
                  </div>
                </div>
              </>
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
                <p className="text-sm">{formData.name} | {categoryTypes.find(t => t.value === formData.type)?.label}</p>
                {formData.manufacturer && <p className="text-sm">{formData.manufacturer} {formData.model}</p>}
              </div>
              {(formData.hostname || formData.ipAddress) && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">🌐 Rede</p>
                  {formData.hostname && <p className="text-sm">Hostname: {formData.hostname}</p>}
                  {formData.ipAddress && <p className="text-sm">IP: {formData.ipAddress}</p>}
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">🔌 Portas</p>
                <p className="text-sm">{totalPorts} portas ({portGroups.length} grupos)</p>
              </div>
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
