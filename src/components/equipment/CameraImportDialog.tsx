import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, Server, Camera, Hash, AlertCircle, Check, Loader2 } from 'lucide-react';
import { parseCSV, readCSVFile, CSVParseResult, inferCameraModel } from '@/lib/csv-parser';
import { useCameraImport } from '@/hooks/useCameraImport';
import { useRacks } from '@/hooks/useRacks';

interface CameraImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CameraImportDialog({ open, onOpenChange }: CameraImportDialogProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'options' | 'importing'>('upload');
  const [csvData, setCsvData] = useState<CSVParseResult | null>(null);
  const [selectedRackId, setSelectedRackId] = useState<string>('');
  const [positionUStart, setPositionUStart] = useState(1);
  const [createNvrs, setCreateNvrs] = useState(true);
  const [importCameras, setImportCameras] = useState(true);
  const [trackVacantChannels, setTrackVacantChannels] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  
  const { racks } = useRacks();
  const { importCameras: doImport, isImporting } = useCameraImport();

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      alert('Por favor, selecione um arquivo CSV');
      return;
    }

    try {
      const content = await readCSVFile(file);
      const parsed = parseCSV(content);
      setCsvData(parsed);
      setStep('preview');
    } catch (error) {
      console.error('Error parsing CSV:', error);
      alert('Erro ao processar arquivo CSV');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragActive(false);
  }, []);

  const handleImport = () => {
    if (!csvData || !selectedRackId) return;

    setStep('importing');
    doImport({
      nvrs: csvData.nvrs,
      options: {
        rackId: selectedRackId,
        positionUStart,
        createNvrs,
        importCameras,
        trackVacantChannels
      }
    }, {
      onSuccess: () => {
        onOpenChange(false);
        resetDialog();
      },
      onError: () => {
        setStep('options');
      }
    });
  };

  const resetDialog = () => {
    setStep('upload');
    setCsvData(null);
    setSelectedRackId('');
    setPositionUStart(1);
  };

  const handleClose = (open: boolean) => {
    if (!open) resetDialog();
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Importar Câmeras via CSV
          </DialogTitle>
          <DialogDescription>
            Importe câmeras e NVRs a partir de um arquivo CSV
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {step === 'upload' && (
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">Arraste o arquivo CSV aqui</p>
              <p className="text-sm text-muted-foreground mb-4">ou</p>
              <Input
                type="file"
                accept=".csv"
                className="max-w-xs mx-auto"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
              <p className="text-xs text-muted-foreground mt-4">
                Formato esperado: CANAL;NVR;IP Câmera;Status;Localização
              </p>
            </div>
          )}

          {step === 'preview' && csvData && (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Server className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                      <p className="text-2xl font-bold">{csvData.nvrs.length}</p>
                      <p className="text-sm text-muted-foreground">NVRs</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Camera className="w-8 h-8 mx-auto mb-2 text-green-500" />
                      <p className="text-2xl font-bold">{csvData.totalCameras}</p>
                      <p className="text-sm text-muted-foreground">Câmeras</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Hash className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                      <p className="text-2xl font-bold">{csvData.totalVacant}</p>
                      <p className="text-sm text-muted-foreground">Canais Vagos</p>
                    </CardContent>
                  </Card>
                </div>

                {csvData.errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {csvData.errors.length} erro(s) encontrado(s) durante o processamento
                    </AlertDescription>
                  </Alert>
                )}

                {/* NVR Details */}
                <div className="space-y-3">
                  {csvData.nvrs.map((nvr, index) => (
                    <Card key={index}>
                      <CardHeader className="py-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Server className="w-4 h-4" />
                          {nvr.name}
                          <Badge variant="outline" className="ml-auto">
                            {nvr.ip}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-2">
                        <div className="flex flex-wrap gap-2 mb-3">
                          <Badge variant="secondary">
                            {nvr.totalChannels} canais
                          </Badge>
                          <Badge className="bg-green-500">
                            {nvr.usedChannels.length} ocupados
                          </Badge>
                          <Badge className="bg-orange-500">
                            {nvr.vacantChannels.length} vagos
                          </Badge>
                        </div>
                        
                        {/* Camera list preview */}
                        <div className="text-sm text-muted-foreground space-y-1">
                          {nvr.cameras.filter(c => c.status === 'cadastrado').slice(0, 3).map((camera, idx) => {
                            const model = inferCameraModel(camera.location);
                            return (
                              <div key={idx} className="flex items-center gap-2">
                                <Camera className="w-3 h-3" />
                                <span>CH{camera.channel}: {camera.cameraIp}</span>
                                <span className="text-xs">({model.modelName})</span>
                              </div>
                            );
                          })}
                          {nvr.cameras.filter(c => c.status === 'cadastrado').length > 3 && (
                            <p className="text-xs text-muted-foreground">
                              +{nvr.cameras.filter(c => c.status === 'cadastrado').length - 3} câmeras...
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </ScrollArea>
          )}

          {step === 'options' && csvData && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Rack de destino *</Label>
                  <Select value={selectedRackId} onValueChange={setSelectedRackId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o rack" />
                    </SelectTrigger>
                    <SelectContent>
                      {racks?.map((rack) => (
                        <SelectItem key={rack.id} value={rack.id}>
                          {rack.name} ({rack.size_u}U)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Posição inicial (U)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={42}
                    value={positionUStart}
                    onChange={(e) => setPositionUStart(parseInt(e.target.value) || 1)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Posição no rack onde o primeiro NVR será instalado
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Opções de importação</Label>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="createNvrs"
                    checked={createNvrs}
                    onCheckedChange={(checked) => setCreateNvrs(checked === true)}
                  />
                  <label htmlFor="createNvrs" className="text-sm">
                    Criar NVRs automaticamente ({csvData.nvrs.length} equipamento{csvData.nvrs.length > 1 ? 's' : ''})
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="importCameras"
                    checked={importCameras}
                    onCheckedChange={(checked) => setImportCameras(checked === true)}
                  />
                  <label htmlFor="importCameras" className="text-sm">
                    Importar informações das câmeras ({csvData.totalCameras} câmera{csvData.totalCameras > 1 ? 's' : ''})
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="trackVacant"
                    checked={trackVacantChannels}
                    onCheckedChange={(checked) => setTrackVacantChannels(checked === true)}
                  />
                  <label htmlFor="trackVacant" className="text-sm">
                    Registrar canais vagos para planejamento ({csvData.totalVacant} canal{csvData.totalVacant > 1 ? 'is' : ''})
                  </label>
                </div>
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-lg font-medium">Importando dados...</p>
              <p className="text-sm text-muted-foreground">Aguarde enquanto os equipamentos são criados</p>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          {step === 'upload' && (
            <Button variant="outline" onClick={() => handleClose(false)}>
              Cancelar
            </Button>
          )}

          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Voltar
              </Button>
              <Button onClick={() => setStep('options')}>
                Continuar
              </Button>
            </>
          )}

          {step === 'options' && (
            <>
              <Button variant="outline" onClick={() => setStep('preview')}>
                Voltar
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={!selectedRackId || isImporting}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Importar
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
