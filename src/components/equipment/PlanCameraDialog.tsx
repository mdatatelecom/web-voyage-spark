import { useState, useRef } from 'react';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Camera, Upload, X, Calendar } from 'lucide-react';
import { CAMERA_TEMPLATES, type CameraTemplate } from '@/constants/cameraSpecs';

interface PlanCameraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nvrId: string;
  nvrName: string;
  channel: number;
}

export function PlanCameraDialog({ 
  open, 
  onOpenChange, 
  nvrId, 
  nvrName,
  channel 
}: PlanCameraDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [plannedIp, setPlannedIp] = useState('');
  const [cameraTemplate, setCameraTemplate] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [plannedDate, setPlannedDate] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const selectedCamera = CAMERA_TEMPLATES.find(c => c.model === cameraTemplate);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `port-locations/${nvrId}/${channel}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('public')
        .getPublicUrl(fileName);

      setImageUrl(urlData.publicUrl);
      toast.success('Imagem enviada com sucesso!');
    } catch (error: any) {
      toast.error(`Erro ao enviar imagem: ${error.message}`);
      setImagePreview(null);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setImageUrl('');
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!location) {
      toast.error('Informe a localização planejada');
      return;
    }

    setLoading(true);
    try {
      // Create port with reserved status for planning
      const notesData = {
        location_image_url: imageUrl || undefined,
        location_description: location,
        planned_ip: plannedIp || undefined,
        planned_camera: cameraTemplate || undefined,
        planned_date: plannedDate || undefined,
        additional_notes: notes || undefined
      };

      const { error } = await supabase.from('ports').insert({
        equipment_id: nvrId,
        name: `CH${channel}`,
        port_number: channel,
        port_type: 'rj45',
        speed: '100Mbps',
        status: 'reserved',
        notes: JSON.stringify(notesData)
      });

      if (error) throw error;

      // Update NVR notes to mark channel as planned
      const { data: nvrData } = await supabase
        .from('equipment')
        .select('notes')
        .eq('id', nvrId)
        .single();

      if (nvrData?.notes) {
        try {
          const currentNotes = typeof nvrData.notes === 'string' 
            ? JSON.parse(nvrData.notes) 
            : nvrData.notes;
          
          const usedChannels = currentNotes.usedChannels || [];
          if (!usedChannels.includes(channel)) {
            usedChannels.push(channel);
          }
          
          const vacantChannels = (currentNotes.vacantChannels || []).filter(
            (ch: number) => ch !== channel
          );

          await supabase.from('equipment').update({
            notes: JSON.stringify({
              ...currentNotes,
              usedChannels,
              vacantChannels
            })
          }).eq('id', nvrId);
        } catch {
          // If notes is not JSON, skip update
        }
      }

      toast.success(`Câmera planejada para Canal ${channel}!`);
      queryClient.invalidateQueries({ queryKey: ['equipment', nvrId] });
      onOpenChange(false);
      
      // Reset form
      setPlannedIp('');
      setCameraTemplate('');
      setLocation('');
      setNotes('');
      setPlannedDate('');
      setImageUrl('');
      setImagePreview(null);
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
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Planejar Câmera - Canal {channel}
          </DialogTitle>
          <DialogDescription>
            NVR: {nvrName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Camera Template */}
          <div className="space-y-2">
            <Label>Modelo da Câmera</Label>
            <Select value={cameraTemplate} onValueChange={setCameraTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um modelo (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {CAMERA_TEMPLATES.map((camera: CameraTemplate) => (
                  <SelectItem key={camera.id} value={camera.model}>
                    {camera.manufacturer} - {camera.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCamera && (
              <p className="text-xs text-muted-foreground">
                {selectedCamera.resolution} • {selectedCamera.cameraType} • {selectedCamera.poeClass}
              </p>
            )}
          </div>

          {/* Planned IP */}
          <div className="space-y-2">
            <Label htmlFor="plannedIp">IP Planejado</Label>
            <Input
              id="plannedIp"
              placeholder="Ex: 10.3.30.25"
              value={plannedIp}
              onChange={(e) => setPlannedIp(e.target.value)}
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Localização / Descrição *</Label>
            <Textarea
              id="location"
              placeholder="Ex: Portão de entrada principal"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              rows={2}
            />
          </div>

          {/* Location Image Upload */}
          <div className="space-y-2">
            <Label>Foto do Local</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-40 object-cover rounded-lg border"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={removeImage}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full h-24 border-dashed"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <div className="flex flex-col items-center gap-1">
                  <Upload className="w-6 h-6" />
                  <span>{uploading ? 'Enviando...' : 'Clique para enviar foto'}</span>
                </div>
              </Button>
            )}
          </div>

          {/* Planned Date */}
          <div className="space-y-2">
            <Label htmlFor="plannedDate">Data Prevista de Instalação</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="plannedDate"
                type="date"
                value={plannedDate}
                onChange={(e) => setPlannedDate(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Notas adicionais..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading || !location}>
            {loading ? 'Salvando...' : 'Planejar Câmera'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
