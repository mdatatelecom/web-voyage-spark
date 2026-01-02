import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { PORT_TYPES, PORT_TYPE_CATEGORIES } from '@/constants/equipmentTypes';
import { compressImage, formatBytes } from '@/lib/image-utils';
import { Upload, X, MapPin, Camera, ImageIcon } from 'lucide-react';

interface PortNotesData {
  location_image_url?: string;
  location_description?: string;
  [key: string]: any;
}

interface PortManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipmentId: string;
  port?: any;
}

export const PortManageDialog = ({ open, onOpenChange, equipmentId, port }: PortManageDialogProps) => {
const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(port ? 'single' : 'batch');
  const [showCloseWarning, setShowCloseWarning] = useState(false);

  // Single port form
  const [name, setName] = useState(port?.name || '');
  const [portNumber, setPortNumber] = useState(port?.port_number?.toString() || '');
  const [portType, setPortType] = useState(port?.port_type || 'rj45');
  const [speed, setSpeed] = useState(port?.speed || '');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState(port?.status || 'available');
  const [locationDescription, setLocationDescription] = useState('');
  const [locationImageUrl, setLocationImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Parse existing notes to extract location data
  const parseNotes = (notesStr: string | null | undefined): PortNotesData => {
    if (!notesStr) return {};
    try {
      return typeof notesStr === 'string' ? JSON.parse(notesStr) : notesStr;
    } catch {
      return { location_description: notesStr };
    }
  };

  // Sync form state with port prop
  useEffect(() => {
    if (port) {
      setName(port.name || '');
      setPortNumber(port.port_number?.toString() || '');
      setPortType(port.port_type || 'rj45');
      setSpeed(port.speed || '');
      setStatus(port.status || 'available');
      setActiveTab('single');
      
      const notesData = parseNotes(port.notes);
      const photoUrl =
        notesData.location_image_url ||
        notesData.locationPhotoUrl ||
        notesData.location_photo_url ||
        notesData.locationImageUrl ||
        '';
      const desc = notesData.location_description || notesData.locationDescription || '';

      setLocationDescription(desc);
      setLocationImageUrl(photoUrl);
      setImagePreview(photoUrl || null);

      // Keep other notes data in the notes field
      const {
        location_image_url,
        locationPhotoUrl,
        location_photo_url,
        locationImageUrl,
        location_description,
        locationDescription,
        ...otherNotes
      } = notesData;
      setNotes(Object.keys(otherNotes).length > 0 ? JSON.stringify(otherNotes) : '');
    } else {
      setName('');
      setPortNumber('');
      setPortType('rj45');
      setSpeed('');
      setNotes('');
      setStatus('available');
      setLocationDescription('');
      setLocationImageUrl('');
      setImagePreview(null);
      setActiveTab('batch');
    }
  }, [port, open]);

  // Handle image upload with compression
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Compress image before upload
      const { file: compressedFile, originalSize, compressedSize } = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.8
      });

      // Preview with compressed file
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(compressedFile);

      const fileName = `port-locations/${equipmentId}/${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(fileName, compressedFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('public')
        .getPublicUrl(fileName);

      setLocationImageUrl(urlData.publicUrl);
      
      const savedPercent = Math.round((1 - compressedSize / originalSize) * 100);
      toast.success(`Imagem enviada! (${formatBytes(originalSize)} → ${formatBytes(compressedSize)}, -${savedPercent}%)`);
    } catch (error: any) {
      toast.error(`Erro ao enviar imagem: ${error.message}`);
      setImagePreview(locationImageUrl || null);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setLocationImageUrl('');
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
      // Build notes JSON with location data
      let existingNotesData: PortNotesData = {};
      try {
        if (notes) {
          existingNotesData = JSON.parse(notes);
        }
      } catch {
        // notes is plain text
      }

      const notesData: PortNotesData = {
        ...existingNotesData,
        // Save in multiple key formats for compatibility across the app
        location_image_url: locationImageUrl || undefined,
        locationPhotoUrl: locationImageUrl || undefined,
        locationImageUrl: locationImageUrl || undefined,
        location_description: locationDescription || undefined,
        locationDescription: locationDescription || undefined,
      };

      const notesJson = Object.keys(notesData).some(k => notesData[k]) 
        ? JSON.stringify(notesData) 
        : null;

      if (port) {
        // Update existing port
        const { error } = await supabase
          .from('ports')
          .update({
            name,
            port_number: portNumber ? parseInt(portNumber) : null,
            port_type: portType,
            speed,
            notes: notesJson,
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
            notes: notesJson,
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

  const handleSave = () => {
    if (port || activeTab === 'single') {
      handleSaveSingle();
    } else {
      handleBatchCreate();
    }
  };

  const isSaveDisabled = () => {
    if (loading || uploading) return true;
    if (port || activeTab === 'single') {
      return !name;
    }
    return !prefix || !startNumber || !quantity;
  };

  const getSaveButtonLabel = () => {
    if (uploading) return 'Enviando imagem...';
    if (port) return 'Atualizar';
    if (activeTab === 'single') return 'Criar Porta';
    return `Criar ${quantity} Portas`;
  };

  // Handle dialog close with upload warning
  const handleDialogClose = (newOpen: boolean) => {
    if (!newOpen && uploading) {
      setShowCloseWarning(true);
      return;
    }
    onOpenChange(newOpen);
  };

  const forceClose = () => {
    setShowCloseWarning(false);
    setUploading(false);
    onOpenChange(false);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b shrink-0">
          <DialogTitle>{port ? 'Editar Porta' : 'Adicionar Portas'}</DialogTitle>
          <DialogDescription>
            {port
              ? 'Atualize as informações da porta'
              : 'Adicione portas individualmente ou em lote'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 px-6 overflow-y-auto" type="always" style={{ WebkitOverflowScrolling: 'touch' }}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full py-4">
            {!port && (
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="single">Individual</TabsTrigger>
                <TabsTrigger value="batch">Em Lote</TabsTrigger>
              </TabsList>
            )}

            <TabsContent value="single" className="space-y-4 mt-0">
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
                    <SelectItem value="disabled">Desabilitado</SelectItem>
                    <SelectItem value="faulty">Defeituoso</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Location Section */}
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4" />
                  <Label className="text-sm font-semibold">Localização da Câmera</Label>
                </div>
                
                {/* Location Description */}
                <div className="space-y-2 mb-3">
                  <Label htmlFor="locationDescription">Descrição do Local</Label>
                  <Textarea
                    id="locationDescription"
                    placeholder="Ex: Portão de entrada principal..."
                    value={locationDescription}
                    onChange={(e) => setLocationDescription(e.target.value)}
                    rows={2}
                  />
                </div>

                {/* Location Image Upload */}
                <div className="space-y-2">
                  <Label>Foto do Local</Label>
                  {/* Hidden input for gallery/file picker */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  {/* Hidden input for camera capture (mobile) */}
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  
                  {uploading ? (
                    <div className="flex items-center justify-center h-16 border border-dashed rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-muted-foreground">Enviando...</span>
                      </div>
                    </div>
                  ) : imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={removeImage}
                        type="button"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      {/* Button to take photo (opens camera on mobile) */}
                      <Button
                        variant="outline"
                        className="flex-1 h-16 border-dashed"
                        onClick={() => cameraInputRef.current?.click()}
                        type="button"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <Camera className="w-5 h-5" />
                          <span className="text-xs">Tirar Foto</span>
                        </div>
                      </Button>
                      
                      {/* Button to choose from gallery */}
                      <Button
                        variant="outline"
                        className="flex-1 h-16 border-dashed"
                        onClick={() => fileInputRef.current?.click()}
                        type="button"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <ImageIcon className="w-5 h-5" />
                          <span className="text-xs">Galeria</span>
                        </div>
                      </Button>
                    </div>
                  )}
                </div>
              </div>

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
            </TabsContent>

            {!port && (
              <TabsContent value="batch" className="space-y-4 mt-0">
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
              </TabsContent>
            )}
          </Tabs>
        </ScrollArea>

        <DialogFooter className="p-6 pt-4 border-t shrink-0">
          <Button variant="outline" onClick={() => handleDialogClose(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaveDisabled()}>
            {getSaveButtonLabel()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Close Warning Dialog */}
    <AlertDialog open={showCloseWarning} onOpenChange={setShowCloseWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Upload em Andamento</AlertDialogTitle>
          <AlertDialogDescription>
            Uma imagem está sendo enviada. Se fechar agora, a imagem será perdida.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setShowCloseWarning(false)}>
            Aguardar Upload
          </AlertDialogCancel>
          <AlertDialogAction onClick={forceClose}>
            Fechar Mesmo Assim
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};
