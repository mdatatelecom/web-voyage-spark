import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronRight, ChevronLeft, Camera, Zap, MapPin, Cable, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useBuildings } from '@/hooks/useBuildings';
import { useFloors } from '@/hooks/useFloors';
import { useRooms } from '@/hooks/useRooms';
import { usePoeSwitchSuggestions, getPoeClass } from '@/hooks/usePoeSwitchSuggestions';
import { useConnections } from '@/hooks/useConnections';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  CAMERA_MANUFACTURERS,
  CAMERA_TEMPLATES,
  CAMERA_RESOLUTIONS,
  CAMERA_CODECS,
  CAMERA_TYPES,
  POE_CLASSES,
  getCameraTemplatesByManufacturer,
  getPoePortType,
  type CameraTemplate
} from '@/constants/cameraSpecs';

interface CameraWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CameraWizard({ open, onOpenChange }: CameraWizardProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  
  // Step 1: Manufacturer/Model
  const [selectedManufacturer, setSelectedManufacturer] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<CameraTemplate | null>(null);
  const [manualEntry, setManualEntry] = useState(false);
  
  // Step 2: Camera specs
  const [cameraData, setCameraData] = useState({
    name: '',
    model: '',
    manufacturer: '',
    resolution: '4mp',
    codec: 'h265',
    cameraType: 'dome',
    poeClass: 'af',
    powerConsumption: 12,
    hasIR: true,
    irRange: 30,
    hasAudio: false,
    hasSD: true,
    locationDescription: '',
  });
  
  // Step 3: Location
  const [locationData, setLocationData] = useState({
    buildingId: '',
    floorId: '',
    roomId: '',
  });
  
  // Step 4: PoE Switch selection
  const [selectedSwitchId, setSelectedSwitchId] = useState('');
  const [selectedPortId, setSelectedPortId] = useState('');
  
  // Hooks
  const { buildings } = useBuildings();
  const { floors } = useFloors(locationData.buildingId);
  const { rooms } = useRooms(locationData.floorId);
  const { data: poeSuggestions, isLoading: loadingPoe } = usePoeSwitchSuggestions('ip_camera', locationData.roomId);
  const { createConnection } = useConnections();
  
  const manufacturerTemplates = selectedManufacturer ? getCameraTemplatesByManufacturer(selectedManufacturer) : [];
  
  // Apply template when selected
  useEffect(() => {
    if (selectedTemplate) {
      setCameraData(prev => ({
        ...prev,
        model: selectedTemplate.model,
        manufacturer: selectedTemplate.manufacturer,
        resolution: selectedTemplate.resolution,
        codec: selectedTemplate.codec,
        cameraType: selectedTemplate.cameraType,
        poeClass: selectedTemplate.poeClass,
        powerConsumption: selectedTemplate.powerConsumption,
        hasIR: selectedTemplate.hasIR,
        irRange: selectedTemplate.irRange || 30,
        hasAudio: selectedTemplate.hasAudio,
        hasSD: selectedTemplate.hasSD,
        name: `CAM-${selectedTemplate.model.replace(/[^A-Z0-9]/gi, '').substring(0, 10)}-`,
      }));
    }
  }, [selectedTemplate]);
  
  // Create camera mutation
  const createCameraMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPortId || !locationData.roomId) {
        throw new Error('Selecione um switch e porta PoE');
      }
      
      // 1. Get a rack from the room (we'll use the same rack as the switch)
      const selectedSwitch = poeSuggestions?.find(s => s.id === selectedSwitchId);
      if (!selectedSwitch) throw new Error('Switch não encontrado');
      
      // Get switch's rack_id
      const { data: switchData, error: switchError } = await supabase
        .from('equipment')
        .select('rack_id')
        .eq('id', selectedSwitchId)
        .single();
      
      if (switchError || !switchData) throw new Error('Erro ao buscar rack do switch');
      
      // 2. Create camera equipment (virtual - no rack position needed for field cameras)
      // For IP cameras, we'll put them at position 0 (virtual)
      const { data: cameraEquipment, error: cameraError } = await supabase
        .from('equipment')
        .insert({
          name: cameraData.name,
          type: 'ip_camera',
          rack_id: switchData.rack_id, // Same rack as switch for now
          position_u_start: 0,
          position_u_end: 0,
          manufacturer: cameraData.manufacturer,
          model: cameraData.model,
          notes: JSON.stringify({
            resolution: cameraData.resolution,
            codec: cameraData.codec,
            cameraType: cameraData.cameraType,
            hasIR: cameraData.hasIR,
            irRange: cameraData.irRange,
            hasAudio: cameraData.hasAudio,
            hasSD: cameraData.hasSD,
            locationDescription: cameraData.locationDescription,
          }),
          power_consumption_watts: cameraData.powerConsumption,
          equipment_status: 'active',
        })
        .select()
        .single();
      
      if (cameraError || !cameraEquipment) throw new Error('Erro ao criar câmera');
      
      // 3. Create camera's port (RJ45 PoE)
      const portType = getPoePortType(cameraData.poeClass);
      const { data: cameraPort, error: portError } = await supabase
        .from('ports')
        .insert([{
          equipment_id: cameraEquipment.id,
          name: 'LAN1',
          port_number: 1,
          port_type: portType as any,
          speed: '100Mbps',
          status: 'available' as const,
        }])
        .select()
        .single();
      
      if (portError || !cameraPort) throw new Error('Erro ao criar porta da câmera');
      
      // 4. Create connection between switch port and camera port
      const { error: connectionError } = await supabase
        .from('connections')
        .insert({
          port_a_id: selectedPortId, // Switch port
          port_b_id: cameraPort.id, // Camera port
          cable_type: 'utp_cat6',
          status: 'active',
          connection_code: `CAM-${Date.now().toString().slice(-6)}`,
        });
      
      if (connectionError) throw new Error('Erro ao criar conexão');
      
      // 5. Update ports status to in_use
      await supabase
        .from('ports')
        .update({ status: 'in_use' })
        .in('id', [selectedPortId, cameraPort.id]);
      
      // 6. Update PoE power consumption on switch
      const { data: switchEquip } = await supabase
        .from('equipment')
        .select('poe_power_per_port')
        .eq('id', selectedSwitchId)
        .single();
      
      const currentPower = (switchEquip?.poe_power_per_port as Record<string, number>) || {};
      currentPower[selectedPortId] = cameraData.powerConsumption;
      
      await supabase
        .from('equipment')
        .update({ poe_power_per_port: currentPower })
        .eq('id', selectedSwitchId);
      
      return cameraEquipment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      queryClient.invalidateQueries({ queryKey: ['ports'] });
      queryClient.invalidateQueries({ queryKey: ['poe-switch-suggestions'] });
      toast.success(`Câmera ${data.name} criada e conectada com sucesso!`);
      handleClose();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
  
  const handleClose = () => {
    setStep(1);
    setSelectedManufacturer('');
    setSelectedTemplate(null);
    setManualEntry(false);
    setCameraData({
      name: '',
      model: '',
      manufacturer: '',
      resolution: '4mp',
      codec: 'h265',
      cameraType: 'dome',
      poeClass: 'af',
      powerConsumption: 12,
      hasIR: true,
      irRange: 30,
      hasAudio: false,
      hasSD: true,
      locationDescription: '',
    });
    setLocationData({ buildingId: '', floorId: '', roomId: '' });
    setSelectedSwitchId('');
    setSelectedPortId('');
    onOpenChange(false);
  };
  
  const canProceed = () => {
    switch (step) {
      case 1: return selectedTemplate !== null || (manualEntry && cameraData.manufacturer);
      case 2: return cameraData.name && cameraData.resolution && cameraData.poeClass;
      case 3: return locationData.roomId;
      case 4: return selectedPortId;
      default: return true;
    }
  };
  
  const selectedSwitch = poeSuggestions?.find(s => s.id === selectedSwitchId);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Adicionar Câmera IP - Passo {step}/4
          </DialogTitle>
        </DialogHeader>
        
        {/* Progress bar */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded transition-colors ${s <= step ? 'bg-primary' : 'bg-muted'}`}
            />
          ))}
        </div>
        
        {/* Step 1: Manufacturer/Model */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-semibold mb-4 block">Selecione o Fabricante</Label>
              <div className="grid grid-cols-3 gap-3">
                {CAMERA_MANUFACTURERS.filter(m => m.id !== 'other').map(mfr => (
                  <button
                    key={mfr.id}
                    onClick={() => {
                      setSelectedManufacturer(mfr.name);
                      setManualEntry(false);
                      setSelectedTemplate(null);
                    }}
                    className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                      selectedManufacturer === mfr.name
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <span className="text-2xl">{mfr.logo}</span>
                    <span className="text-sm font-medium">{mfr.name}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Checkbox
                id="manual"
                checked={manualEntry}
                onCheckedChange={(checked) => {
                  setManualEntry(!!checked);
                  if (checked) {
                    setSelectedManufacturer('');
                    setSelectedTemplate(null);
                  }
                }}
              />
              <Label htmlFor="manual" className="cursor-pointer">Cadastro manual (sem template)</Label>
            </div>
            
            {selectedManufacturer && !manualEntry && (
              <div className="space-y-3">
                <Label>Modelo da Câmera</Label>
                <div className="grid gap-3 max-h-[300px] overflow-y-auto">
                  {manufacturerTemplates.map(template => (
                    <Card
                      key={template.id}
                      className={`cursor-pointer transition-all ${
                        selectedTemplate?.id === template.id
                          ? 'ring-2 ring-primary'
                          : 'hover:bg-accent/50'
                      }`}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">{template.model}</p>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="secondary">
                                {CAMERA_RESOLUTIONS.find(r => r.value === template.resolution)?.label}
                              </Badge>
                              <Badge variant="outline">
                                {CAMERA_TYPES.find(t => t.value === template.cameraType)?.label}
                              </Badge>
                              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">
                                <Zap className="w-3 h-3 mr-1" />
                                {template.powerConsumption}W
                              </Badge>
                            </div>
                          </div>
                          {selectedTemplate?.id === template.id && (
                            <Check className="w-5 h-5 text-primary" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            
            {manualEntry && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fabricante *</Label>
                  <Input
                    value={cameraData.manufacturer}
                    onChange={(e) => setCameraData({ ...cameraData, manufacturer: e.target.value })}
                    placeholder="Ex: Hikvision"
                  />
                </div>
                <div>
                  <Label>Modelo *</Label>
                  <Input
                    value={cameraData.model}
                    onChange={(e) => setCameraData({ ...cameraData, model: e.target.value })}
                    placeholder="Ex: DS-2CD2143G2-I"
                  />
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Step 2: Camera Specs */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label>Nome da Câmera *</Label>
              <Input
                value={cameraData.name}
                onChange={(e) => setCameraData({ ...cameraData, name: e.target.value })}
                placeholder="Ex: CAM-ENTRADA-01"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Resolução</Label>
                <Select
                  value={cameraData.resolution}
                  onValueChange={(v) => setCameraData({ ...cameraData, resolution: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CAMERA_RESOLUTIONS.map(r => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Codec</Label>
                <Select
                  value={cameraData.codec}
                  onValueChange={(v) => setCameraData({ ...cameraData, codec: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CAMERA_CODECS.map(c => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label} ({c.efficiency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Câmera</Label>
                <Select
                  value={cameraData.cameraType}
                  onValueChange={(v) => setCameraData({ ...cameraData, cameraType: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CAMERA_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.icon} {t.label} - {t.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Classe PoE</Label>
                <Select
                  value={cameraData.poeClass}
                  onValueChange={(v) => {
                    const poe = POE_CLASSES.find(p => p.value === v);
                    setCameraData({
                      ...cameraData,
                      poeClass: v,
                      powerConsumption: Math.min(cameraData.powerConsumption, poe?.maxWatts || 15),
                    });
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {POE_CLASSES.map(p => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label} (até {p.maxWatts}W)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Consumo PoE (Watts)</Label>
                <Input
                  type="number"
                  value={cameraData.powerConsumption}
                  onChange={(e) => setCameraData({ ...cameraData, powerConsumption: parseInt(e.target.value) || 0 })}
                  max={POE_CLASSES.find(p => p.value === cameraData.poeClass)?.maxWatts}
                />
              </div>
              
              <div>
                <Label>Alcance IR (metros)</Label>
                <Input
                  type="number"
                  value={cameraData.irRange}
                  onChange={(e) => setCameraData({ ...cameraData, irRange: parseInt(e.target.value) || 0 })}
                  disabled={!cameraData.hasIR}
                />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-6 pt-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={cameraData.hasIR}
                  onCheckedChange={(v) => setCameraData({ ...cameraData, hasIR: v })}
                />
                <Label>Infravermelho</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={cameraData.hasAudio}
                  onCheckedChange={(v) => setCameraData({ ...cameraData, hasAudio: v })}
                />
                <Label>Áudio</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={cameraData.hasSD}
                  onCheckedChange={(v) => setCameraData({ ...cameraData, hasSD: v })}
                />
                <Label>Slot SD</Label>
              </div>
            </div>
          </div>
        )}
        
        {/* Step 3: Location */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-4">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">Selecione onde a câmera será instalada para buscar switches PoE próximos</span>
            </div>
            
            <div>
              <Label>Prédio *</Label>
              <Select
                value={locationData.buildingId}
                onValueChange={(v) => setLocationData({ buildingId: v, floorId: '', roomId: '' })}
              >
                <SelectTrigger><SelectValue placeholder="Selecione o prédio" /></SelectTrigger>
                <SelectContent>
                  {buildings?.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Andar/Setor *</Label>
              <Select
                value={locationData.floorId}
                onValueChange={(v) => setLocationData({ ...locationData, floorId: v, roomId: '' })}
                disabled={!locationData.buildingId}
              >
                <SelectTrigger><SelectValue placeholder="Selecione o andar" /></SelectTrigger>
                <SelectContent>
                  {floors?.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Sala *</Label>
              <Select
                value={locationData.roomId}
                onValueChange={(v) => {
                  setLocationData({ ...locationData, roomId: v });
                  setSelectedSwitchId('');
                  setSelectedPortId('');
                }}
                disabled={!locationData.floorId}
              >
                <SelectTrigger><SelectValue placeholder="Selecione a sala" /></SelectTrigger>
                <SelectContent>
                  {rooms?.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Descrição da Localização (opcional)</Label>
              <Input
                value={cameraData.locationDescription}
                onChange={(e) => setCameraData({ ...cameraData, locationDescription: e.target.value })}
                placeholder="Ex: Entrada principal, Corredor do 2º andar"
              />
            </div>
          </div>
        )}
        
        {/* Step 4: PoE Switch Selection */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-4">
              <Zap className="w-4 h-4" />
              <span className="text-sm">
                Câmera requer {cameraData.powerConsumption}W ({getPoeClass(cameraData.powerConsumption)})
              </span>
            </div>
            
            {loadingPoe ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Buscando switches PoE disponíveis...
              </div>
            ) : poeSuggestions && poeSuggestions.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {poeSuggestions.map(sw => (
                  <Card
                    key={sw.id}
                    className={`cursor-pointer transition-all ${
                      selectedSwitchId === sw.id ? 'ring-2 ring-primary' : 'hover:bg-accent/50'
                    }`}
                    onClick={() => {
                      setSelectedSwitchId(sw.id);
                      setSelectedPortId('');
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Cable className="w-4 h-4 text-blue-500" />
                            <span className="font-semibold">{sw.name}</span>
                            {sw.sameRoom && (
                              <Badge variant="secondary" className="text-xs">Mesma Sala</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            📍 {sw.roomName} - {sw.rackName}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="text-green-600">
                              ⚡ {sw.availableWatts.toFixed(0)}W disponíveis
                            </span>
                            <span className="text-muted-foreground">
                              🔌 {sw.availablePorts.length} portas livres
                            </span>
                          </div>
                        </div>
                        {selectedSwitchId === sw.id && (
                          <Check className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      
                      {selectedSwitchId === sw.id && (
                        <div className="mt-4 pt-4 border-t">
                          <Label className="text-xs mb-2 block">Selecione a Porta:</Label>
                          <div className="flex flex-wrap gap-2">
                            {sw.availablePorts.map(port => (
                              <Button
                                key={port.id}
                                size="sm"
                                variant={selectedPortId === port.id ? 'default' : 'outline'}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPortId(port.id);
                                }}
                              >
                                {port.name}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border rounded-lg border-dashed">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
                <p className="font-medium">Nenhum switch PoE disponível</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Não há switches PoE com portas livres e budget suficiente ({cameraData.powerConsumption}W)
                </p>
              </div>
            )}
            
            {selectedPortId && selectedSwitch && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-sm font-medium text-green-700 dark:text-green-400">
                  ✓ Conexão configurada: {cameraData.name} → {selectedSwitch.name} ({selectedSwitch.availablePorts.find(p => p.id === selectedPortId)?.name})
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => step === 1 ? handleClose() : setStep(s => s - 1)}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            {step === 1 ? 'Cancelar' : 'Voltar'}
          </Button>
          
          {step < 4 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}>
              Próximo
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={() => createCameraMutation.mutate()}
              disabled={!canProceed() || createCameraMutation.isPending}
            >
              {createCameraMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Criar Câmera e Conectar
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
