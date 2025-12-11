import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useConnections } from '@/hooks/useConnections';
import { usePoeSwitchSuggestions, getDevicePoeConsumption, getPoeClass } from '@/hooks/usePoeSwitchSuggestions';
import { ChevronRight, ChevronLeft, Cable, Zap } from 'lucide-react';
import { PortSelector } from './PortSelector';
import { Database } from '@/integrations/supabase/types';
import { CABLE_TYPES, CABLE_COLORS } from '@/constants/cables';

type CableType = Database['public']['Enums']['cable_type'];

interface ConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConnectionDialog({ open, onOpenChange }: ConnectionDialogProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    portAId: '',
    portAInfo: null as any,
    portBId: '',
    portBInfo: null as any,
    cableType: '' as CableType | '',
    cableLength: '',
    cableColor: '#3b82f6',
    status: 'active' as const,
    notes: '',
    vlanId: '',
    vlanName: '',
    vlanTagging: 'untagged' as 'tagged' | 'untagged' | 'native'
  });

  const { createConnection, isCreating } = useConnections();

  const handleSubmit = () => {
    createConnection({
      port_a_id: formData.portAId,
      port_b_id: formData.portBId,
      cable_type: formData.cableType as CableType,
      cable_length_meters: formData.cableLength ? parseFloat(formData.cableLength) : undefined,
      cable_color: formData.cableColor,
      status: formData.status,
      notes: formData.notes || undefined,
      vlan_id: formData.vlanId ? parseInt(formData.vlanId) : undefined,
      vlan_name: formData.vlanName || undefined,
      vlan_tagging: formData.vlanTagging
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setStep(1);
        setFormData({
          portAId: '', portAInfo: null, portBId: '', portBInfo: null,
          cableType: '', cableLength: '', cableColor: '#3b82f6',
          status: 'active', notes: '',
          vlanId: '', vlanName: '', vlanTagging: 'untagged'
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cable className="w-5 h-5" />
            Nova Conexão - Passo {step}/4
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded ${s <= step ? 'bg-primary' : 'bg-muted'}`}
            />
          ))}
        </div>

        {step === 1 && (
          <PortSelector
            label="📍 Ponto A (Origem)"
            selectedPortId={formData.portAId}
            onPortSelect={(portId, portInfo) => setFormData({ ...formData, portAId: portId, portAInfo: portInfo })}
            excludePortId={formData.portBId}
          />
        )}

        {step === 2 && (
          <PoeSuggestionStep 
            formData={formData}
            setFormData={setFormData}
          />
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <Label>Tipo de Cabo *</Label>
              <Select value={formData.cableType} onValueChange={(v: CableType) => setFormData({ ...formData, cableType: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o tipo de cabo" /></SelectTrigger>
                <SelectContent>
                  {CABLE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Comprimento (metros)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.cableLength}
                onChange={(e) => setFormData({ ...formData, cableLength: e.target.value })}
                placeholder="Ex: 5.5"
              />
            </div>

            <div>
              <Label>Cor do Cabo</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {CABLE_COLORS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setFormData({ ...formData, cableColor: c.value })}
                    className={`
                      h-10 rounded flex items-center justify-center text-sm font-medium
                      border-2 transition-all
                      ${formData.cableColor === c.value ? 'border-primary scale-105' : 'border-transparent'}
                    `}
                    style={{ backgroundColor: c.value, color: c.value === '#ffffff' ? '#000' : '#fff' }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Status Inicial</Label>
              <Select value={formData.status} onValueChange={(v: any) => setFormData({ ...formData, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">⚫ Ativo</SelectItem>
                  <SelectItem value="testing">🟡 Testando</SelectItem>
                  <SelectItem value="reserved">🔵 Reservado</SelectItem>
                  <SelectItem value="inactive">⚪ Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            {/* VLAN Configuration */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                🌐 Configuração de VLAN (Opcional)
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>VLAN ID</Label>
                  <Input
                    type="number"
                    min="1"
                    max="4094"
                    value={formData.vlanId}
                    onChange={(e) => setFormData({ ...formData, vlanId: e.target.value })}
                    placeholder="Ex: 100"
                  />
                </div>

                <div>
                  <Label>Nome da VLAN</Label>
                  <Input
                    value={formData.vlanName}
                    onChange={(e) => setFormData({ ...formData, vlanName: e.target.value })}
                    placeholder="Ex: VLAN_GESTAO"
                  />
                </div>
              </div>

              <div className="mt-3">
                <Label>Tipo de Tagging</Label>
                <Select 
                  value={formData.vlanTagging} 
                  onValueChange={(v: any) => setFormData({ ...formData, vlanTagging: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="untagged">Untagged (sem tag 802.1Q)</SelectItem>
                    <SelectItem value="tagged">Tagged (com tag 802.1Q)</SelectItem>
                    <SelectItem value="native">Native (VLAN nativa do trunk)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="p-6 bg-muted rounded-lg space-y-6">
              <div className="p-4 bg-background rounded-lg">
                <p className="text-sm font-medium text-muted-foreground mb-2">📍 PONTO A (Origem)</p>
                {formData.portAInfo && (
                  <>
                    <p className="text-sm">🔌 {formData.portAInfo.equipmentName}</p>
                    <p className="text-sm">🔗 Porta: {formData.portAInfo.portName}</p>
                  </>
                )}
              </div>

              <div className="text-center py-2">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg">
                  <Cable className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {CABLE_TYPES.find(t => t.value === formData.cableType)?.label}
                    {formData.cableLength && ` | ${formData.cableLength}m`}
                  </span>
                  <div
                    className="w-6 h-6 rounded border-2 border-white"
                    style={{ backgroundColor: formData.cableColor }}
                  />
                </div>
              </div>

              <div className="p-4 bg-background rounded-lg">
                <p className="text-sm font-medium text-muted-foreground mb-2">📍 PONTO B (Destino)</p>
                {formData.portBInfo && (
                  <>
                    <p className="text-sm">🔌 {formData.portBInfo.equipmentName}</p>
                    <p className="text-sm">🔗 Porta: {formData.portBInfo.portName}</p>
                  </>
                )}
              </div>
            </div>

            <div className="p-4 bg-primary/10 rounded-lg">
              <p className="text-sm text-center">
                ℹ️ O código de conexão será gerado automaticamente (ex: C-00001)
              </p>
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

          {step < 4 ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={
                (step === 1 && !formData.portAId) ||
                (step === 2 && !formData.portBId) ||
                (step === 3 && !formData.cableType)
              }
            >
              Próximo
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isCreating}>
              {isCreating ? 'Criando...' : '✅ Criar Conexão'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// PoE Suggestion Step Component
function PoeSuggestionStep({ 
  formData, 
  setFormData 
}: { 
  formData: any; 
  setFormData: (data: any) => void;
}) {
  const deviceType = formData.portAInfo?.equipmentType;
  const roomId = formData.portAInfo?.roomId;
  const consumption = getDevicePoeConsumption(deviceType || '');
  
  const { data: suggestions = [], isLoading } = usePoeSwitchSuggestions(deviceType, roomId);
  
  const handleSelectSuggestion = (suggestion: any) => {
    if (suggestion.availablePorts.length > 0) {
      const port = suggestion.availablePorts[0];
      setFormData({
        ...formData,
        portBId: port.id,
        portBInfo: {
          equipmentName: suggestion.name,
          portName: port.name,
          equipmentType: 'switch_poe',
          roomId: null
        }
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* PoE Suggestions Card */}
      {consumption > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-600" />
              Switches PoE com Budget Disponível
            </CardTitle>
            <CardDescription>
              O dispositivo selecionado consome ~{consumption}W via PoE ({getPoeClass(consumption)})
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Buscando switches PoE...</p>
            ) : suggestions.length > 0 ? (
              suggestions.slice(0, 5).map((sw) => (
                <Button
                  key={sw.id}
                  variant="outline"
                  className="w-full justify-between h-auto py-2"
                  onClick={() => handleSelectSuggestion(sw)}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{sw.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {sw.rackName} • {sw.roomName}
                      {sw.sameRoom && <Badge variant="secondary" className="ml-2 text-xs">Mesma sala</Badge>}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                      {sw.availableWatts}W disp.
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {sw.availablePorts.length} porta(s) PoE
                    </span>
                  </div>
                </Button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum switch PoE com budget suficiente encontrado.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Regular Port Selector */}
      <PortSelector
        label="📍 Ponto B (Destino)"
        selectedPortId={formData.portBId}
        onPortSelect={(portId, portInfo) => setFormData({ ...formData, portBId: portId, portBInfo: portInfo })}
        excludePortId={formData.portAId}
      />
    </div>
  );
}
