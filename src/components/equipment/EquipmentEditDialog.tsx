import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Save, Info, MapPin, Upload, X, Loader2 } from 'lucide-react';
import { getEquipmentFieldConfig, AIRFLOW_OPTIONS, EQUIPMENT_STATUS_OPTIONS } from '@/constants/equipmentTypes';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Equipment {
  id: string;
  name: string;
  type: string;
  hostname?: string;
  ip_address?: string;
  serial_number?: string;
  notes?: string;
  manufacturer?: string;
  model?: string;
  asset_tag?: string;
  primary_mac_address?: string;
  power_consumption_watts?: number;
  weight_kg?: number;
  airflow?: string;
  equipment_status?: string;
}

interface EquipmentNotesData {
  location_image_url?: string;
  location_description?: string;
  live_url?: string;
  text?: string;
  // NVR-specific fields
  totalChannels?: number;
  usedChannels?: number[];
  vacantChannels?: number[];
}

interface EquipmentEditDialogProps {
  equipment: Equipment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<Equipment>) => void;
  isLoading?: boolean;
}

const parseNotesData = (notes: string | null): EquipmentNotesData => {
  if (!notes) return {};
  try {
    const parsed = typeof notes === 'string' ? JSON.parse(notes) : notes;
    return parsed as EquipmentNotesData;
  } catch {
    return { text: notes };
  }
};

export function EquipmentEditDialog({
  equipment,
  open,
  onOpenChange,
  onSave,
  isLoading
}: EquipmentEditDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    hostname: '',
    ip_address: '',
    serial_number: '',
    manufacturer: '',
    model: '',
    notes: '',
    asset_tag: '',
    primary_mac_address: '',
    power_consumption_watts: '',
    weight_kg: '',
    airflow: '',
    equipment_status: 'active'
  });

  // Camera location states
  const [locationImageUrl, setLocationImageUrl] = useState('');
  const [locationDescription, setLocationDescription] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Get field configuration based on equipment type
  const fieldConfig = getEquipmentFieldConfig(equipment?.type || 'other');
  const isCamera = equipment?.type === 'ip_camera';

  useEffect(() => {
    if (equipment) {
      const parsedNotes = parseNotesData(equipment.notes || null);
      
      // For cameras, extract location data
      if (equipment.type === 'ip_camera') {
        setLocationImageUrl(parsedNotes.location_image_url || '');
        setLocationDescription(parsedNotes.location_description || '');
      } else {
        setLocationImageUrl('');
        setLocationDescription('');
      }

      setFormData({
        name: equipment.name || '',
        hostname: equipment.hostname || '',
        ip_address: equipment.ip_address || '',
        serial_number: equipment.serial_number || '',
        manufacturer: equipment.manufacturer || '',
        model: equipment.model || '',
        notes: parsedNotes.text || (typeof equipment.notes === 'string' && !equipment.notes.startsWith('{') ? equipment.notes : ''),
        asset_tag: equipment.asset_tag || '',
        primary_mac_address: equipment.primary_mac_address || '',
        power_consumption_watts: equipment.power_consumption_watts?.toString() || '',
        weight_kg: equipment.weight_kg?.toString() || '',
        airflow: equipment.airflow || '',
        equipment_status: equipment.equipment_status || 'active'
      });
    }
  }, [equipment]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !equipment) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `camera-${equipment.id}-${Date.now()}.${fileExt}`;
      const filePath = `camera-locations/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('public')
        .getPublicUrl(filePath);

      setLocationImageUrl(publicUrl);
      toast.success('Imagem enviada com sucesso!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar imagem');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    if (locationImageUrl && equipment) {
      try {
        // Extract file path from URL
        const urlParts = locationImageUrl.split('/public/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          await supabase.storage.from('public').remove([filePath]);
        }
      } catch (error) {
        console.error('Error removing image:', error);
      }
    }
    setLocationImageUrl('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipment) return;

    // Build notes value
    let notesValue = formData.notes;
    
    if (isCamera) {
      // For cameras, store location data in notes as JSON
      // Save BOTH key formats for maximum compatibility
      const existingNotes = parseNotesData(equipment.notes || null);
      const notesData: Record<string, any> = {
        ...existingNotes,
        // Save in both formats for compatibility
        location_image_url: locationImageUrl || undefined,
        locationPhotoUrl: locationImageUrl || undefined,
        location_description: locationDescription || undefined,
        locationDescription: locationDescription || undefined,
        text: formData.notes || undefined,
      };
      
      // Clean up undefined values
      Object.keys(notesData).forEach(key => {
        if (notesData[key] === undefined) {
          delete notesData[key];
        }
      });
      
      notesValue = Object.keys(notesData).length > 0 ? JSON.stringify(notesData) : undefined;
    }
    
    onSave({
      id: equipment.id,
      name: formData.name,
      manufacturer: formData.manufacturer || undefined,
      model: formData.model || undefined,
      serial_number: formData.serial_number || undefined,
      notes: notesValue,
      hostname: fieldConfig.fields.hostname ? formData.hostname || undefined : undefined,
      ip_address: fieldConfig.fields.ipAddress ? formData.ip_address || undefined : undefined,
      asset_tag: fieldConfig.fields.assetTag ? formData.asset_tag || undefined : undefined,
      primary_mac_address: fieldConfig.fields.macAddress ? formData.primary_mac_address || undefined : undefined,
      power_consumption_watts: fieldConfig.fields.powerConsumption && formData.power_consumption_watts 
        ? parseInt(formData.power_consumption_watts) 
        : undefined,
      weight_kg: fieldConfig.fields.weight && formData.weight_kg 
        ? parseFloat(formData.weight_kg) 
        : undefined,
      airflow: fieldConfig.fields.airflow ? formData.airflow || undefined : undefined,
      equipment_status: formData.equipment_status || 'active'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle>Editar Equipamento</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <form id="equipment-edit-form" onSubmit={handleSubmit} className="space-y-4 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="equipment_status">Status</Label>
              <Select 
                value={formData.equipment_status} 
                onValueChange={(v) => setFormData({ ...formData, equipment_status: v })}
              >
                <SelectTrigger id="equipment_status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${opt.color}`} />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Network fields - only show if equipment supports network */}
          {fieldConfig.hasNetwork && (
            <>
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-3">🌐 Configuração de Rede</h3>
                <div className="grid grid-cols-2 gap-4">
                  {fieldConfig.fields.hostname && (
                    <div className="space-y-2">
                      <Label htmlFor="hostname">Hostname</Label>
                      <Input
                        id="hostname"
                        value={formData.hostname}
                        onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
                      />
                    </div>
                  )}

                  {fieldConfig.fields.ipAddress && (
                    <div className="space-y-2">
                      <Label htmlFor="ip_address">Endereço IP</Label>
                      <Input
                        id="ip_address"
                        value={formData.ip_address}
                        onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                        placeholder="192.168.1.1"
                      />
                    </div>
                  )}
                </div>

                {fieldConfig.fields.macAddress && (
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="primary_mac_address">MAC Address Principal</Label>
                    <Input
                      id="primary_mac_address"
                      value={formData.primary_mac_address}
                      onChange={(e) => setFormData({ ...formData, primary_mac_address: e.target.value })}
                      placeholder="AA:BB:CC:DD:EE:FF"
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Show info for passive equipment */}
          {!fieldConfig.hasNetwork && !fieldConfig.fields.assetTag && (
            <div className="p-3 bg-muted rounded-lg flex items-start gap-2">
              <Info className="w-4 h-4 text-muted-foreground mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Este tipo de equipamento é passivo e não possui configurações de rede.
              </p>
            </div>
          )}

          {/* Camera Location Section - Only for IP Cameras */}
          {isCamera && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Localização da Câmera
              </h3>
              
              {/* Image Preview */}
              {locationImageUrl && (
                <div className="relative mb-4 rounded-lg overflow-hidden border">
                  <img
                    src={locationImageUrl}
                    alt="Localização da câmera"
                    className="w-full h-48 object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={handleRemoveImage}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Upload Area */}
              {!locationImageUrl && (
                <div className="border-2 border-dashed rounded-lg p-6 text-center mb-4">
                  {uploadingImage ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                      <p className="text-sm text-muted-foreground">Enviando imagem...</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Clique para selecionar uma foto do local
                      </p>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="max-w-xs mx-auto cursor-pointer"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        JPG, PNG ou WebP (máx. 5MB)
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Location Description */}
              <div className="space-y-2">
                <Label htmlFor="location_description">Descrição do Local</Label>
                <Input
                  id="location_description"
                  value={locationDescription}
                  onChange={(e) => setLocationDescription(e.target.value)}
                  placeholder="Ex: Corredor principal, entrada da sala 101"
                />
              </div>

            </div>
          )}

          {/* Identification */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-3">📋 Identificação</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="manufacturer">Fabricante</Label>
                <Input
                  id="manufacturer"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Modelo</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="serial_number">Número de Série</Label>
                <Input
                  id="serial_number"
                  value={formData.serial_number}
                  onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                />
              </div>

              {fieldConfig.fields.assetTag && (
                <div className="space-y-2">
                  <Label htmlFor="asset_tag">Tag de Patrimônio</Label>
                  <Input
                    id="asset_tag"
                    value={formData.asset_tag}
                    onChange={(e) => setFormData({ ...formData, asset_tag: e.target.value })}
                    placeholder="PAT-000001"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Physical Specs - only show if any of these fields are enabled */}
          {(fieldConfig.fields.powerConsumption || fieldConfig.fields.weight || fieldConfig.fields.airflow) && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">⚡ Especificações Físicas</h3>
              <div className="grid grid-cols-2 gap-4">
                {fieldConfig.fields.powerConsumption && (
                  <div className="space-y-2">
                    <Label htmlFor="power_consumption_watts">Consumo (Watts)</Label>
                    <Input
                      id="power_consumption_watts"
                      type="number"
                      value={formData.power_consumption_watts}
                      onChange={(e) => setFormData({ ...formData, power_consumption_watts: e.target.value })}
                      placeholder="500"
                    />
                  </div>
                )}

                {fieldConfig.fields.weight && (
                  <div className="space-y-2">
                    <Label htmlFor="weight_kg">Peso (kg)</Label>
                    <Input
                      id="weight_kg"
                      type="number"
                      step="0.1"
                      value={formData.weight_kg}
                      onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                      placeholder="12.5"
                    />
                  </div>
                )}

                {fieldConfig.fields.airflow && (
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="airflow">Fluxo de Ar</Label>
                    <Select 
                      value={formData.airflow} 
                      onValueChange={(v) => setFormData({ ...formData, airflow: v })}
                    >
                      <SelectTrigger id="airflow">
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
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          </form>
        </ScrollArea>

        <div className="flex justify-end gap-2 p-6 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="equipment-edit-form" disabled={isLoading || uploadingImage}>
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
