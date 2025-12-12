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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ChevronRight, ChevronLeft, Camera, Zap, MapPin, Cable, Check, AlertCircle, Loader2, Upload, X, ImageIcon } from 'lucide-react';
import { useBuildings } from '@/hooks/useBuildings';
import { useFloors } from '@/hooks/useFloors';
import { useRooms } from '@/hooks/useRooms';
import { usePoeSwitchSuggestions, getPoeClass } from '@/hooks/usePoeSwitchSuggestions';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  CAMERA_MANUFACTURERS,
  CAMERA_TEMPLATES,
  CAMERA_RESOLUTIONS,
  CAMERA_CODECS,
  CAMERA_TYPES,
  POE_CLASSES,
  CAMERA_CONNECTION_TYPES,
  POWER_SOURCE_TYPES,
  POE_INJECTOR_TEMPLATES,
  ANALOG_CAMERA_TEMPLATES,
  getCameraTemplatesByManufacturer,
  getAnalogCameraTemplatesByManufacturer,
  getPoePortType,
  type CameraTemplate,
  type AnalogCameraTemplate
} from '@/constants/cameraSpecs';

interface CameraWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CameraWizard({ open, onOpenChange }: CameraWizardProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  
  // Step 1: Connection Type (IP vs Conventional)
  const [connectionType, setConnectionType] = useState<string>('ip');
  
  // Step 2: Manufacturer/Model
  const [selectedManufacturer, setSelectedManufacturer] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<CameraTemplate | null>(null);
  const [selectedAnalogTemplate, setSelectedAnalogTemplate] = useState<AnalogCameraTemplate | null>(null);
  const [manualEntry, setManualEntry] = useState(false);
  
  // Step 3: Camera specs
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
  
  // Step 4: Location + Photo
  const [locationData, setLocationData] = useState({
    buildingId: '',
    floorId: '',
    roomId: '',
  });
  const [locationPhoto, setLocationPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // Step 5: Power Source (PoE Switch, Injector, or External)
  const [powerSource, setPowerSource] = useState<string>('switch_poe');
  const [selectedSwitchId, setSelectedSwitchId] = useState('');
  const [selectedPortId, setSelectedPortId] = useState('');
  const [selectedInjectorId, setSelectedInjectorId] = useState('');
  const [createNewInjector, setCreateNewInjector] = useState(false);
  const [newInjectorData, setNewInjectorData] = useState({
    name: '',
    manufacturer: '',
    model: '',
    poeClass: 'af',
    maxWatts: 15.4,
  });
  
  // Hooks
  const { buildings } = useBuildings();
  const { floors } = useFloors(locationData.buildingId);
  const { rooms } = useRooms(locationData.floorId);
  const { data: poeSuggestions, isLoading: loadingPoe } = usePoeSwitchSuggestions('ip_camera', locationData.roomId);
  
  // Fetch existing PoE injectors
  const { data: poeInjectors } = useQuery({
    queryKey: ['poe-injectors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment')
        .select('id, name, manufacturer, model, poe_budget_watts')
        .eq('type', 'poe_injector');
      if (error) throw error;
      return data || [];
    },
    enabled: connectionType === 'ip',
  });
  
  const isIPCamera = connectionType === 'ip';
  const manufacturerTemplates = selectedManufacturer 
    ? (isIPCamera ? getCameraTemplatesByManufacturer(selectedManufacturer) : getAnalogCameraTemplatesByManufacturer(selectedManufacturer))
    : [];
  
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
  
  // Apply analog template
  useEffect(() => {
    if (selectedAnalogTemplate) {
      setCameraData(prev => ({
        ...prev,
        model: selectedAnalogTemplate.model,
        manufacturer: selectedAnalogTemplate.manufacturer,
        resolution: selectedAnalogTemplate.resolution,
        cameraType: selectedAnalogTemplate.cameraType,
        hasIR: selectedAnalogTemplate.hasIR,
        irRange: selectedAnalogTemplate.irRange || 30,
        hasAudio: selectedAnalogTemplate.hasAudio,
        name: `CAM-${selectedAnalogTemplate.model.replace(/[^A-Z0-9]/gi, '').substring(0, 10)}-`,
      }));
    }
  }, [selectedAnalogTemplate]);
  
  // Handle photo upload
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLocationPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };
  
  const removePhoto = () => {
    setLocationPhoto(null);
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
    }
  };
  
  // Upload photo to Supabase Storage
  const uploadPhoto = async (cameraId: string): Promise<string | null> => {
    if (!locationPhoto) return null;
    
    setUploadingPhoto(true);
    try {
      const fileExt = locationPhoto.name.split('.').pop();
      const filePath = `cameras/${cameraId}/location.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('public')
        .upload(filePath, locationPhoto, { upsert: true });
      
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from('public')
        .getPublicUrl(filePath);
      
      return publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  };
  
  // Create camera mutation
  const createCameraMutation = useMutation({
    mutationFn: async () => {
      if (!locationData.roomId) {
        throw new Error('Selecione a localização da câmera');
      }
      
      // For IP cameras, require power source selection
      if (isIPCamera && powerSource === 'switch_poe' && !selectedPortId) {
        throw new Error('Selecione um switch e porta PoE');
      }
      
      let rackId: string;
      
      // Get rack ID based on power source
      if (isIPCamera && powerSource === 'switch_poe' && selectedSwitchId) {
        const { data: switchData, error: switchError } = await supabase
          .from('equipment')
          .select('rack_id')
          .eq('id', selectedSwitchId)
          .single();
        
        if (switchError || !switchData) throw new Error('Erro ao buscar rack do switch');
        rackId = switchData.rack_id;
      } else {
        // Get first rack from the room
        const { data: roomRacks, error: rackError } = await supabase
          .from('racks')
          .select('id')
          .eq('room_id', locationData.roomId)
          .limit(1);
        
        if (rackError || !roomRacks?.[0]) throw new Error('Nenhum rack encontrado na sala selecionada');
        rackId = roomRacks[0].id;
      }
      
      // Create camera equipment
      const { data: cameraEquipment, error: cameraError } = await supabase
        .from('equipment')
        .insert({
          name: cameraData.name,
          type: 'ip_camera',
          rack_id: rackId,
          position_u_start: 0,
          position_u_end: 0,
          manufacturer: cameraData.manufacturer,
          model: cameraData.model,
          notes: JSON.stringify({
            connectionType,
            resolution: cameraData.resolution,
            codec: isIPCamera ? cameraData.codec : null,
            cameraType: cameraData.cameraType,
            hasIR: cameraData.hasIR,
            irRange: cameraData.irRange,
            hasAudio: cameraData.hasAudio,
            hasSD: isIPCamera ? cameraData.hasSD : false,
            locationDescription: cameraData.locationDescription,
            powerSource: isIPCamera ? powerSource : 'external',
          }),
          power_consumption_watts: isIPCamera ? cameraData.powerConsumption : null,
          equipment_status: 'active',
        })
        .select()
        .single();
      
      if (cameraError || !cameraEquipment) throw new Error('Erro ao criar câmera');
      
      // Upload location photo if provided
      if (locationPhoto) {
        const photoUrl = await uploadPhoto(cameraEquipment.id);
        if (photoUrl) {
          const currentNotes = JSON.parse(cameraEquipment.notes || '{}');
          await supabase
            .from('equipment')
            .update({ notes: JSON.stringify({ ...currentNotes, locationPhotoUrl: photoUrl }) })
            .eq('id', cameraEquipment.id);
        }
      }
      
      // For IP cameras with switch PoE, create connection
      if (isIPCamera && powerSource === 'switch_poe' && selectedPortId) {
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
        
        // Create connection
        const { error: connectionError } = await supabase
          .from('connections')
          .insert({
            port_a_id: selectedPortId,
            port_b_id: cameraPort.id,
            cable_type: 'utp_cat6',
            status: 'active',
            connection_code: `CAM-${Date.now().toString().slice(-6)}`,
          });
        
        if (connectionError) throw new Error('Erro ao criar conexão');
        
        // Update ports status
        await supabase
          .from('ports')
          .update({ status: 'in_use' })
          .in('id', [selectedPortId, cameraPort.id]);
        
        // Update PoE power consumption
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
      }
      
      return cameraEquipment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      queryClient.invalidateQueries({ queryKey: ['ports'] });
      queryClient.invalidateQueries({ queryKey: ['poe-switch-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['cameras'] });
      toast.success(`Câmera ${data.name} criada com sucesso!`);
      handleClose();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
  
  const handleClose = () => {
    setStep(1);
    setConnectionType('ip');
    setSelectedManufacturer('');
    setSelectedTemplate(null);
    setSelectedAnalogTemplate(null);
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
    setPowerSource('switch_poe');
    setSelectedSwitchId('');
    setSelectedPortId('');
    setSelectedInjectorId('');
    removePhoto();
    onOpenChange(false);
  };
  
  const getTotalSteps = () => isIPCamera ? 5 : 4;
  
  const canProceed = () => {
    switch (step) {
      case 1: return connectionType;
      case 2: return selectedTemplate !== null || selectedAnalogTemplate !== null || (manualEntry && cameraData.manufacturer);
      case 3: return cameraData.name && cameraData.resolution;
      case 4: return locationData.roomId;
      case 5: {
        if (!isIPCamera) return true;
        if (powerSource === 'switch_poe') return selectedPortId;
        if (powerSource === 'poe_injector') return selectedInjectorId || (createNewInjector && newInjectorData.name);
        return true; // external power
      }
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
            Adicionar Câmera - Passo {step}/{getTotalSteps()}
          </DialogTitle>
        </DialogHeader>
        
        {/* Progress bar */}
        <div className="flex gap-2 mb-6">
          {Array.from({ length: getTotalSteps() }, (_, i) => i + 1).map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded transition-colors ${s <= step ? 'bg-primary' : 'bg-muted'}`}
            />
          ))}
        </div>
        
        {/* Step 1: Connection Type */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-semibold mb-4 block">Tipo de Câmera</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {CAMERA_CONNECTION_TYPES.filter(t => ['ip', 'hdtvi', 'hdcvi'].includes(t.value)).map(type => (
                  <button
                    key={type.value}
                    onClick={() => {
                      setConnectionType(type.value);
                      setSelectedManufacturer('');
                      setSelectedTemplate(null);
                      setSelectedAnalogTemplate(null);
                    }}
                    className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                      connectionType === type.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <span className="text-3xl">{type.icon}</span>
                    <span className="font-medium">{type.label}</span>
                    <span className="text-xs text-muted-foreground text-center">{type.description}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">Diferenças:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Câmera IP:</strong> Conecta via rede Ethernet, alimentada por PoE (switch ou injetor)</li>
                <li><strong>HD-TVI/CVI:</strong> Conecta via cabo coaxial ou balun UTP, alimentada por fonte externa ou PoC</li>
              </ul>
            </div>
          </div>
        )}
        
        {/* Step 2: Manufacturer/Model */}
        {step === 2 && (
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
                      setSelectedAnalogTemplate(null);
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
                    setSelectedAnalogTemplate(null);
                  }
                }}
              />
              <Label htmlFor="manual" className="cursor-pointer">Cadastro manual (sem template)</Label>
            </div>
            
            {selectedManufacturer && !manualEntry && (
              <div className="space-y-3">
                <Label>Modelo da Câmera {isIPCamera ? '(IP)' : `(${connectionType.toUpperCase()})`}</Label>
                <div className="grid gap-3 max-h-[300px] overflow-y-auto">
                  {isIPCamera ? (
                    manufacturerTemplates.map(template => {
                      const t = template as CameraTemplate;
                      return (
                        <Card
                          key={t.id}
                          className={`cursor-pointer transition-all ${
                            selectedTemplate?.id === t.id
                              ? 'ring-2 ring-primary'
                              : 'hover:bg-accent/50'
                          }`}
                          onClick={() => setSelectedTemplate(t)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold">{t.model}</p>
                                <div className="flex gap-2 mt-1 flex-wrap">
                                  <Badge variant="secondary">
                                    {CAMERA_RESOLUTIONS.find(r => r.value === t.resolution)?.label}
                                  </Badge>
                                  <Badge variant="outline">
                                    {CAMERA_TYPES.find(ct => ct.value === t.cameraType)?.label}
                                  </Badge>
                                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">
                                    <Zap className="w-3 h-3 mr-1" />
                                    {t.powerConsumption}W
                                  </Badge>
                                </div>
                              </div>
                              {selectedTemplate?.id === t.id && (
                                <Check className="w-5 h-5 text-primary" />
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  ) : (
                    (manufacturerTemplates as AnalogCameraTemplate[]).map(template => (
                      <Card
                        key={template.id}
                        className={`cursor-pointer transition-all ${
                          selectedAnalogTemplate?.id === template.id
                            ? 'ring-2 ring-primary'
                            : 'hover:bg-accent/50'
                        }`}
                        onClick={() => setSelectedAnalogTemplate(template)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold">{template.model}</p>
                              <div className="flex gap-2 mt-1 flex-wrap">
                                <Badge variant="secondary">{template.resolution.toUpperCase()}</Badge>
                                <Badge variant="outline">
                                  {CAMERA_TYPES.find(ct => ct.value === template.cameraType)?.label}
                                </Badge>
                                <Badge variant="outline">{template.connectionType.toUpperCase()}</Badge>
                              </div>
                            </div>
                            {selectedAnalogTemplate?.id === template.id && (
                              <Check className="w-5 h-5 text-primary" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                  {manufacturerTemplates.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      Nenhum template disponível para {selectedManufacturer} ({isIPCamera ? 'IP' : connectionType.toUpperCase()})
                    </p>
                  )}
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
        
        {/* Step 3: Camera Specs */}
        {step === 3 && (
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
              
              {isIPCamera && (
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
              )}
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
              
            </div>
            
            {/* Seção PoE destacada para câmeras IP */}
            {isIPCamera && (
              <Card className="border-yellow-500/50 bg-yellow-500/5">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    <Label className="text-base font-semibold">Alimentação PoE</Label>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="flex items-center gap-1">
                        Classe PoE <span className="text-destructive">*</span>
                      </Label>
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
                        <SelectTrigger className="bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {POE_CLASSES.map(p => (
                            <SelectItem key={p.value} value={p.value}>
                              <div className="flex items-center gap-2">
                                <Zap className="w-3 h-3" />
                                {p.label} (até {p.maxWatts}W)
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label className="flex items-center gap-1">
                        Consumo (Watts) <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        type="number"
                        className="bg-background"
                        value={cameraData.powerConsumption}
                        onChange={(e) => setCameraData({ ...cameraData, powerConsumption: parseInt(e.target.value) || 0 })}
                        max={POE_CLASSES.find(p => p.value === cameraData.poeClass)?.maxWatts}
                      />
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    ⚡ A classe PoE determina a potência máxima que o switch pode fornecer. 
                    Selecione a classe compatível com sua câmera (verifique no datasheet).
                  </p>
                </CardContent>
              </Card>
            )}
            
            <div className="grid grid-cols-2 gap-4">
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
              {isIPCamera && (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={cameraData.hasSD}
                    onCheckedChange={(v) => setCameraData({ ...cameraData, hasSD: v })}
                  />
                  <Label>Slot SD</Label>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Step 4: Location + Photo */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-4">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">Selecione onde a câmera será instalada</span>
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
            
            {/* Photo upload section */}
            <div className="space-y-3 border-t pt-4 mt-4">
              <Label className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Foto da Localização (opcional)
              </Label>
              <p className="text-sm text-muted-foreground">
                Faça upload de uma foto mostrando onde a câmera será instalada para facilitar a identificação futura.
              </p>
              
              <div className="flex gap-4 items-start">
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="cursor-pointer"
                  />
                </div>
                {photoPreview && (
                  <div className="relative w-32 h-24 flex-shrink-0">
                    <img 
                      src={photoPreview} 
                      alt="Preview" 
                      className="w-full h-full object-cover rounded-lg border"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 w-6 h-6"
                      onClick={removePhoto}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Step 5: Power Source (IP cameras only) */}
        {step === 5 && isIPCamera && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-4">
              <Zap className="w-4 h-4" />
              <span className="text-sm">
                Câmera requer {cameraData.powerConsumption}W ({getPoeClass(cameraData.powerConsumption)})
              </span>
            </div>
            
            {/* Power source selection */}
            <RadioGroup value={powerSource} onValueChange={setPowerSource} className="space-y-3">
              {POWER_SOURCE_TYPES.map(type => (
                <div key={type.value} className="flex items-center space-x-3">
                  <RadioGroupItem value={type.value} id={type.value} />
                  <Label htmlFor={type.value} className="flex items-center gap-2 cursor-pointer">
                    <span>{type.icon}</span>
                    <span className="font-medium">{type.label}</span>
                    <span className="text-muted-foreground text-sm">- {type.description}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
            
            {/* Switch PoE selection */}
            {powerSource === 'switch_poe' && (
              <div className="mt-4">
                {loadingPoe ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    Buscando switches PoE disponíveis...
                  </div>
                ) : poeSuggestions && poeSuggestions.length > 0 ? (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
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
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setPowerSource('poe_injector')}
                    >
                      Usar Injetor PoE
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            {/* PoE Injector selection */}
            {powerSource === 'poe_injector' && (
              <div className="mt-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="new-injector"
                    checked={createNewInjector}
                    onCheckedChange={(checked) => setCreateNewInjector(!!checked)}
                  />
                  <Label htmlFor="new-injector" className="cursor-pointer">Cadastrar novo injetor PoE</Label>
                </div>
                
                {!createNewInjector && (
                  <Select value={selectedInjectorId} onValueChange={setSelectedInjectorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um injetor existente" />
                    </SelectTrigger>
                    <SelectContent>
                      {poeInjectors?.map(inj => (
                        <SelectItem key={inj.id} value={inj.id}>
                          {inj.name} ({inj.manufacturer} {inj.model})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                
                {createNewInjector && (
                  <div className="space-y-3 p-4 border rounded-lg">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Nome do Injetor *</Label>
                        <Input
                          value={newInjectorData.name}
                          onChange={(e) => setNewInjectorData({ ...newInjectorData, name: e.target.value })}
                          placeholder="Ex: INJ-POE-01"
                        />
                      </div>
                      <div>
                        <Label>Modelo</Label>
                        <Select
                          value={newInjectorData.model}
                          onValueChange={(v) => {
                            const template = POE_INJECTOR_TEMPLATES.find(t => t.model === v);
                            if (template) {
                              setNewInjectorData({
                                ...newInjectorData,
                                model: template.model,
                                manufacturer: template.manufacturer,
                                poeClass: template.poeClass,
                                maxWatts: template.maxWatts,
                              });
                            }
                          }}
                        >
                          <SelectTrigger><SelectValue placeholder="Selecione modelo" /></SelectTrigger>
                          <SelectContent>
                            {POE_INJECTOR_TEMPLATES.map(t => (
                              <SelectItem key={t.id} value={t.model}>
                                {t.manufacturer} {t.model} ({t.maxWatts}W)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* External power - just info */}
            {powerSource === 'external' && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  A câmera será alimentada por fonte externa DC (12V ou 24V). 
                  Certifique-se de que há uma fonte de alimentação disponível no local de instalação.
                </p>
              </div>
            )}
            
            {/* Connection summary */}
            {selectedPortId && selectedSwitch && powerSource === 'switch_poe' && (
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
          
          {step < getTotalSteps() ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}>
              Próximo
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={() => createCameraMutation.mutate()}
              disabled={!canProceed() || createCameraMutation.isPending || uploadingPhoto}
            >
              {createCameraMutation.isPending || uploadingPhoto ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {uploadingPhoto ? 'Enviando foto...' : 'Criando...'}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Criar Câmera
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
