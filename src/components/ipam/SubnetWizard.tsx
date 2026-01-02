import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { parseCIDR, validateCIDR, generateIPRecords, formatIPCount, type CIDRInfo } from '@/lib/cidr-utils';
import { useSubnets } from '@/hooks/useSubnets';
import { useIPAddresses } from '@/hooks/useIPAddresses';
import { useBuildings } from '@/hooks/useBuildings';
import { Network, ArrowRight, ArrowLeft, Check, AlertTriangle, Info, Loader2 } from 'lucide-react';

interface SubnetWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type WizardStep = 1 | 2 | 3 | 4;

export function SubnetWizard({ open, onOpenChange }: SubnetWizardProps) {
  const [step, setStep] = useState<WizardStep>(1);
  
  // Step 1: Basic data
  const [name, setName] = useState('');
  const [cidr, setCidr] = useState('');
  const [description, setDescription] = useState('');
  
  // Step 2: Configuration
  const [autoGenerateIPs, setAutoGenerateIPs] = useState(true);
  const [reserveGateway, setReserveGateway] = useState(true);
  const [gatewayName, setGatewayName] = useState('');
  const [vlanId, setVlanId] = useState('');
  const [buildingId, setBuildingId] = useState('');
  
  // Validation state
  const [cidrInfo, setCidrInfo] = useState<CIDRInfo | null>(null);
  const [validation, setValidation] = useState<{ valid: boolean; errors: string[]; warnings: string[] }>({ valid: false, errors: [], warnings: [] });
  const [overlapError, setOverlapError] = useState<string | null>(null);
  
  const { createSubnet, isCreating, checkCIDROverlap } = useSubnets();
  const { createBatch, isCreatingBatch } = useIPAddresses(undefined);
  const { buildings } = useBuildings();

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep(1);
      setName('');
      setCidr('');
      setDescription('');
      setAutoGenerateIPs(true);
      setReserveGateway(true);
      setGatewayName('');
      setVlanId('');
      setBuildingId('');
      setCidrInfo(null);
      setValidation({ valid: false, errors: [], warnings: [] });
      setOverlapError(null);
    }
  }, [open]);

  // Validate CIDR in real-time
  useEffect(() => {
    if (!cidr) {
      setCidrInfo(null);
      setValidation({ valid: false, errors: [], warnings: [] });
      setOverlapError(null);
      return;
    }

    const result = validateCIDR(cidr);
    setValidation(result);

    if (result.valid) {
      const info = parseCIDR(cidr);
      setCidrInfo(info);

      // Check overlap
      checkCIDROverlap(cidr).then(overlap => {
        setOverlapError(overlap);
      });
    } else {
      setCidrInfo(null);
    }
  }, [cidr, checkCIDROverlap]);

  const canProceedStep1 = name.trim() && validation.valid && !overlapError;
  const canProceedStep2 = true; // Optional fields
  const isLargeNetwork = cidrInfo && cidrInfo.totalAddresses > 4096;

  const handleCreate = async () => {
    if (!cidrInfo) return;

    try {
      // Create subnet
      const subnet = await createSubnet({
        name: name.trim(),
        description: description.trim() || undefined,
        ip_version: cidrInfo.version,
        cidr: cidrInfo.cidr,
        network_address: cidrInfo.networkAddress,
        prefix_length: cidrInfo.prefixLength,
        gateway_ip: reserveGateway && cidrInfo.gatewayAddress ? cidrInfo.gatewayAddress : undefined,
        gateway_name: reserveGateway && gatewayName.trim() ? gatewayName.trim() : undefined,
        broadcast_address: cidrInfo.broadcastAddress || undefined,
        total_addresses: cidrInfo.totalAddresses,
        usable_addresses: cidrInfo.usableAddresses,
        vlan_id: vlanId ? parseInt(vlanId, 10) : undefined,
        building_id: buildingId || undefined
      });

      // Generate IPs if requested and IPv4
      if (autoGenerateIPs && cidrInfo.version === 'ipv4' && subnet) {
        const ipRecords = generateIPRecords(cidrInfo.cidr, {
          reserveGateway,
          gatewayName: gatewayName.trim() || undefined
        });

        if (ipRecords.length > 0) {
          await createBatch(ipRecords.map(r => ({
            subnet_id: subnet.id,
            ...r
          })));
        }
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Error creating subnet:', error);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome da Rede *</Label>
        <Input
          id="name"
          placeholder="Ex: VLAN_FINANCEIRO"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cidr">Prefixo CIDR *</Label>
        <Input
          id="cidr"
          placeholder="Ex: 192.168.10.0/24"
          value={cidr}
          onChange={(e) => setCidr(e.target.value)}
          className={validation.errors.length > 0 ? 'border-destructive' : ''}
        />
        
        {/* Real-time validation feedback */}
        {validation.errors.map((err, i) => (
          <p key={i} className="text-sm text-destructive">{err}</p>
        ))}
        
        {overlapError && (
          <Alert variant="destructive" className="mt-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{overlapError}</AlertDescription>
          </Alert>
        )}

        {validation.warnings.map((warn, i) => (
          <Alert key={i} className="mt-2">
            <Info className="h-4 w-4" />
            <AlertDescription>{warn}</AlertDescription>
          </Alert>
        ))}
      </div>

      {/* CIDR Info Preview */}
      {cidrInfo && (
        <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant={cidrInfo.version === 'ipv4' ? 'default' : 'secondary'}>
              {cidrInfo.version.toUpperCase()}
            </Badge>
            <span className="text-sm font-medium">{cidrInfo.cidr}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Total de IPs:</span>{' '}
              <span className="font-medium">{formatIPCount(cidrInfo.totalAddresses)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">IPs utilizáveis:</span>{' '}
              <span className="font-medium">{formatIPCount(cidrInfo.usableAddresses)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          placeholder="Descrição opcional da sub-rede"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      {cidrInfo?.version === 'ipv4' && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="autoGenerate"
            checked={autoGenerateIPs}
            onCheckedChange={(checked) => setAutoGenerateIPs(checked as boolean)}
            disabled={isLargeNetwork}
          />
          <Label htmlFor="autoGenerate" className="cursor-pointer">
            Gerar IPs automaticamente
            {isLargeNetwork && (
              <span className="text-xs text-muted-foreground ml-2">
                (Desabilitado para redes grandes)
              </span>
            )}
          </Label>
        </div>
      )}

      {cidrInfo?.version === 'ipv6' && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Para IPv6, a geração automática de IPs não é suportada devido à escala.
            Os IPs serão adicionados manualmente conforme necessário.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center space-x-2">
        <Checkbox
          id="reserveGateway"
          checked={reserveGateway}
          onCheckedChange={(checked) => setReserveGateway(checked as boolean)}
        />
        <Label htmlFor="reserveGateway" className="cursor-pointer">
          Reservar Gateway automaticamente
          {cidrInfo?.gatewayAddress && (
            <span className="text-xs text-muted-foreground ml-2">
              ({cidrInfo.gatewayAddress})
            </span>
          )}
        </Label>
      </div>

      {reserveGateway && (
        <div className="space-y-2 ml-6">
          <Label htmlFor="gatewayName">Nome do Gateway</Label>
          <Input
            id="gatewayName"
            placeholder="Ex: Firewall Financeiro"
            value={gatewayName}
            onChange={(e) => setGatewayName(e.target.value)}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="vlanId">VLAN ID (opcional)</Label>
        <Input
          id="vlanId"
          type="number"
          placeholder="Ex: 100"
          value={vlanId}
          onChange={(e) => setVlanId(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="building">Prédio Associado (opcional)</Label>
        <Select value={buildingId || 'none'} onValueChange={(v) => setBuildingId(v === 'none' ? '' : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um prédio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhum</SelectItem>
            {buildings.map((building) => (
              <SelectItem key={building.id} value={building.id}>
                {building.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <h3 className="font-medium">Resumo da Sub-rede</h3>
      
      <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Nome:</span>
          <span className="font-medium">{name}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tipo:</span>
          <Badge variant={cidrInfo?.version === 'ipv4' ? 'default' : 'secondary'}>
            {cidrInfo?.version.toUpperCase()}
          </Badge>
        </div>
        
        <div className="flex justify-between">
          <span className="text-muted-foreground">CIDR:</span>
          <span className="font-mono">{cidrInfo?.cidr}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total de IPs:</span>
          <span>{formatIPCount(cidrInfo?.totalAddresses || 0)}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-muted-foreground">IPs utilizáveis:</span>
          <span>{formatIPCount(cidrInfo?.usableAddresses || 0)}</span>
        </div>
        
        {reserveGateway && cidrInfo?.gatewayAddress && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Gateway:</span>
            <span className="font-mono">{cidrInfo.gatewayAddress}</span>
          </div>
        )}
        
        {cidrInfo?.broadcastAddress && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Broadcast:</span>
            <span className="font-mono">{cidrInfo.broadcastAddress}</span>
          </div>
        )}
        
        {vlanId && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">VLAN:</span>
            <span>{vlanId}</span>
          </div>
        )}
        
        {buildingId && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Prédio:</span>
            <span>{buildings.find(b => b.id === buildingId)?.name || '-'}</span>
          </div>
        )}
      </div>

      {autoGenerateIPs && cidrInfo?.version === 'ipv4' && !isLargeNetwork && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Serão gerados {formatIPCount(cidrInfo.totalAddresses)} registros de IP automaticamente.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4 text-center py-4">
      <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
        <Network className="h-8 w-8 text-primary" />
      </div>
      
      <h3 className="font-medium text-lg">Tudo pronto!</h3>
      <p className="text-muted-foreground">
        Clique em "Criar Sub-rede" para finalizar a criação.
      </p>
      
      <Button
        onClick={handleCreate}
        disabled={isCreating || isCreatingBatch}
        className="w-full"
        size="lg"
      >
        {(isCreating || isCreatingBatch) ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Criando...
          </>
        ) : (
          <>
            <Check className="mr-2 h-4 w-4" />
            Criar Sub-rede
          </>
        )}
      </Button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Nova Sub-rede
            <Badge variant="outline" className="ml-2">
              Etapa {step}/4
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex gap-1 mb-4">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${
                s <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="min-h-[300px]">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </div>

        {/* Navigation buttons */}
        {step < 4 && (
          <div className="flex justify-between mt-4">
            <Button
              variant="outline"
              onClick={() => setStep((s) => (s - 1) as WizardStep)}
              disabled={step === 1}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            
            <Button
              onClick={() => setStep((s) => (s + 1) as WizardStep)}
              disabled={
                (step === 1 && !canProceedStep1) ||
                (step === 2 && !canProceedStep2)
              }
            >
              Próximo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
