import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings2, Crosshair } from 'lucide-react';

interface ScaleConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentScaleRatio: number;
  currentPixelsPerCm: number;
  onApply: (scaleRatio: number, pixelsPerCm: number) => void;
  calibrationMode: boolean;
  onStartCalibration: () => void;
  calibrationDistance?: number; // Distance in pixels from calibration
}

export function ScaleConfigDialog({
  open,
  onOpenChange,
  currentScaleRatio,
  currentPixelsPerCm,
  onApply,
  calibrationMode,
  onStartCalibration,
  calibrationDistance,
}: ScaleConfigDialogProps) {
  const [scaleRatio, setScaleRatio] = useState(currentScaleRatio.toString());
  const [pixelsPerCm, setPixelsPerCm] = useState(currentPixelsPerCm.toString());
  const [knownDistance, setKnownDistance] = useState('1');
  const [activeTab, setActiveTab] = useState('manual');

  useEffect(() => {
    setScaleRatio(currentScaleRatio.toString());
    setPixelsPerCm(currentPixelsPerCm.toString());
  }, [currentScaleRatio, currentPixelsPerCm, open]);

  // Calculate pixelsPerCm from calibration
  useEffect(() => {
    if (calibrationDistance && calibrationDistance > 0 && activeTab === 'calibration') {
      const knownDistanceCm = parseFloat(knownDistance) * 100; // meters to cm
      if (knownDistanceCm > 0) {
        const calculatedPixelsPerCm = calibrationDistance / knownDistanceCm;
        setPixelsPerCm(calculatedPixelsPerCm.toFixed(2));
      }
    }
  }, [calibrationDistance, knownDistance, activeTab]);

  const handleApply = () => {
    const ratio = parseFloat(scaleRatio) || 100;
    const pxPerCm = parseFloat(pixelsPerCm) || 10;
    onApply(ratio, pxPerCm);
    onOpenChange(false);
  };

  // Calculate the resulting measureScale for preview
  const previewMeasureScale = (parseFloat(pixelsPerCm) || 10) * 100 / (parseFloat(scaleRatio) || 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Configurar Escala
          </DialogTitle>
          <DialogDescription>
            Configure a escala da planta para medições precisas
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual</TabsTrigger>
            <TabsTrigger value="calibration">Calibração</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="scaleRatio">Escala do Desenho</Label>
              <div className="flex items-center gap-2">
                <span className="text-lg font-medium">1:</span>
                <Input
                  id="scaleRatio"
                  type="number"
                  value={scaleRatio}
                  onChange={(e) => setScaleRatio(e.target.value)}
                  placeholder="100"
                  className="w-24"
                  min="1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Escalas comuns: 1:50 (detalhes), 1:100 (residencial), 1:200 (industrial), 1:500 (grandes áreas)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pixelsPerCm">Resolução (pixels por cm)</Label>
              <Input
                id="pixelsPerCm"
                type="number"
                value={pixelsPerCm}
                onChange={(e) => setPixelsPerCm(e.target.value)}
                placeholder="10"
                step="0.1"
                min="0.1"
              />
              <p className="text-xs text-muted-foreground">
                Quantos pixels representam 1 cm no desenho. Ajuste baseado na resolução da sua planta.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="calibration" className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <p className="text-sm">
                1. Clique no botão abaixo para iniciar a calibração
              </p>
              <p className="text-sm">
                2. Clique em dois pontos de uma distância conhecida na planta (ex: largura de uma porta)
              </p>
              <p className="text-sm">
                3. Informe a distância real em metros
              </p>
              
              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={onStartCalibration}
                disabled={calibrationMode}
              >
                <Crosshair className="h-4 w-4" />
                {calibrationMode ? 'Clique em dois pontos na planta...' : 'Iniciar Calibração'}
              </Button>
            </div>

            {calibrationDistance && calibrationDistance > 0 && (
              <div className="space-y-2">
                <Label htmlFor="knownDistance">Distância real (metros)</Label>
                <Input
                  id="knownDistance"
                  type="number"
                  value={knownDistance}
                  onChange={(e) => setKnownDistance(e.target.value)}
                  placeholder="1.0"
                  step="0.1"
                  min="0.1"
                />
                <p className="text-xs text-muted-foreground">
                  Distância medida: {calibrationDistance.toFixed(0)} pixels
                  {parseFloat(pixelsPerCm) > 0 && ` = ${parseFloat(pixelsPerCm).toFixed(2)} px/cm`}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="calibScaleRatio">Escala do Desenho</Label>
              <div className="flex items-center gap-2">
                <span className="text-lg font-medium">1:</span>
                <Input
                  id="calibScaleRatio"
                  type="number"
                  value={scaleRatio}
                  onChange={(e) => setScaleRatio(e.target.value)}
                  placeholder="100"
                  className="w-24"
                  min="1"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-sm font-medium">Resultado:</p>
          <p className="text-xs text-muted-foreground">
            1 metro real = {previewMeasureScale.toFixed(1)} pixels no desenho
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleApply}>
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
