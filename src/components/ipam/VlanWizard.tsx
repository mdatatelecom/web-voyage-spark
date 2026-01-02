import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useVlans, VLAN_CATEGORIES, CreateVlanData } from '@/hooks/useVlans';
import { useBuildings } from '@/hooks/useBuildings';
import { useSubnets, CreateSubnetData } from '@/hooks/useSubnets';
import { validateCIDR, parseCIDR } from '@/lib/cidr-utils';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  AlertTriangle, 
  Network, 
  Settings,
  Plus,
  Monitor,
  Phone,
  Users,
  Link,
  Cpu
} from 'lucide-react';

interface VlanWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type WizardStep = 1 | 2 | 3;

const getCategoryIcon = (category: string) => {
  const icons: Record<string, React.ReactNode> = {
    data: <Monitor className="h-4 w-4" />,
    voice: <Phone className="h-4 w-4" />,
    management: <Settings className="h-4 w-4" />,
    guest: <Users className="h-4 w-4" />,
    native: <Link className="h-4 w-4" />,
    iot: <Cpu className="h-4 w-4" />,
  };
  return icons[category] || <Network className="h-4 w-4" />;
};

export function VlanWizard({ open, onOpenChange }: VlanWizardProps) {
  const [step, setStep] = useState<WizardStep>(1);
  
  // Step 1: Basic Data
  const [vlanId, setVlanId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('data');
  const [buildingId, setBuildingId] = useState<string>('');
  
  // Step 2: IP Range (Optional)
  const [createSubnet, setCreateSubnet] = useState(false);
  const [cidr, setCidr] = useState('');
  const [subnetName, setSubnetName] = useState('');
  
  // Validation states
  const [vlanIdError, setVlanIdError] = useState<string | null>(null);
  const [vlanIdWarning, setVlanIdWarning] = useState<string | null>(null);
  const [cidrError, setCidrError] = useState<string | null>(null);
  const [isCheckingVlanId, setIsCheckingVlanId] = useState(false);
  
  const { createVlan, isCreating, checkVlanIdAvailable, getReservedWarning } = useVlans();
  const { buildings } = useBuildings();
  const { createSubnet: createSubnetMutation, checkCIDROverlap } = useSubnets();
  
  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep(1);
      setVlanId('');
      setName('');
      setDescription('');
      setCategory('data');
      setBuildingId('');
      setCreateSubnet(false);
      setCidr('');
      setSubnetName('');
      setVlanIdError(null);
      setVlanIdWarning(null);
      setCidrError(null);
    }
  }, [open]);
  
  // Validate VLAN ID
  useEffect(() => {
    const validateVlanId = async () => {
      if (!vlanId) {
        setVlanIdError(null);
        setVlanIdWarning(null);
        return;
      }
      
      const id = parseInt(vlanId, 10);
      
      if (isNaN(id) || id < 1 || id > 4094) {
        setVlanIdError('VLAN ID deve estar entre 1 e 4094');
        setVlanIdWarning(null);
        return;
      }
      
      // Check reserved warning
      const warning = getReservedWarning(id);
      setVlanIdWarning(warning);
      
      // Check availability
      setIsCheckingVlanId(true);
      const isAvailable = await checkVlanIdAvailable(id);
      setIsCheckingVlanId(false);
      
      if (!isAvailable) {
        setVlanIdError('Este VLAN ID já está em uso');
      } else {
        setVlanIdError(null);
      }
    };
    
    const debounce = setTimeout(validateVlanId, 300);
    return () => clearTimeout(debounce);
  }, [vlanId, checkVlanIdAvailable, getReservedWarning]);
  
  // Validate CIDR
  useEffect(() => {
    const validateCidr = async () => {
      if (!cidr || !createSubnet) {
        setCidrError(null);
        return;
      }
      
      const validation = validateCIDR(cidr);
      if (!validation.valid) {
        setCidrError(validation.errors[0] || 'CIDR inválido');
        return;
      }
      
      const overlap = await checkCIDROverlap(cidr);
      if (overlap) {
        setCidrError(overlap);
        return;
      }
      
      setCidrError(null);
    };
    
    const debounce = setTimeout(validateCidr, 300);
    return () => clearTimeout(debounce);
  }, [cidr, createSubnet, checkCIDROverlap]);
  
  const selectedCategory = VLAN_CATEGORIES.find(c => c.value === category);
  
  const canProceedStep1 = vlanId && name && !vlanIdError && !isCheckingVlanId;
  const canProceedStep2 = !createSubnet || (createSubnet && cidr && subnetName && !cidrError);
  
  const handleCreate = async () => {
    try {
      const vlanData: CreateVlanData = {
        vlan_id: parseInt(vlanId, 10),
        name,
        description: description || undefined,
        category,
        color: selectedCategory?.color,
        building_id: buildingId || undefined,
        is_active: true,
      };
      
      await createVlan(vlanData);
      
      // Create subnet if requested - using the newly created VLAN's UUID
      if (createSubnet && cidr && subnetName) {
        const parsed = parseCIDR(cidr);
        if (parsed) {
          // Fetch the newly created VLAN to get its UUID
          const { data: newVlan } = await supabase
            .from('vlans')
            .select('id')
            .eq('vlan_id', parseInt(vlanId, 10))
            .single();
          
          const subnetData: CreateSubnetData = {
            name: subnetName,
            cidr: parsed.cidr,
            description: `Sub-rede da VLAN ${vlanId} - ${name}`,
            ip_version: parsed.version,
            network_address: parsed.networkAddress,
            prefix_length: parsed.prefixLength,
            gateway_ip: parsed.gatewayAddress || undefined,
            broadcast_address: parsed.broadcastAddress || undefined,
            total_addresses: parsed.totalAddresses,
            usable_addresses: parsed.usableAddresses,
            vlan_id: parseInt(vlanId, 10),
            vlan_uuid: newVlan?.id || undefined,
            building_id: buildingId || undefined,
          };
          await createSubnetMutation(subnetData);
        }
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating VLAN:', error);
    }
  };
  
  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="vlan-id">VLAN ID *</Label>
          <Input
            id="vlan-id"
            type="number"
            min={1}
            max={4094}
            placeholder="1-4094"
            value={vlanId}
            onChange={(e) => setVlanId(e.target.value)}
          />
          {vlanIdError && (
            <p className="text-sm text-destructive">{vlanIdError}</p>
          )}
          {vlanIdWarning && !vlanIdError && (
            <Alert variant="default" className="py-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">{vlanIdWarning}</AlertDescription>
            </Alert>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="vlan-name">Nome *</Label>
          <Input
            id="vlan-name"
            placeholder="Ex: VLAN_FINANCEIRO"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="category">Categoria</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VLAN_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                <div className="flex items-center gap-2">
                  {getCategoryIcon(cat.value)}
                  <span>{cat.label}</span>
                  <div 
                    className="w-3 h-3 rounded-full ml-2" 
                    style={{ backgroundColor: cat.color }}
                  />
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="building">Prédio (opcional)</Label>
        <Select value={buildingId || 'none'} onValueChange={(v) => setBuildingId(v === 'none' ? '' : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um prédio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhum</SelectItem>
            {buildings?.map((building) => (
              <SelectItem key={building.id} value={building.id}>
                {building.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description">Descrição (opcional)</Label>
        <Textarea
          id="description"
          placeholder="Descreva o propósito desta VLAN..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>
    </div>
  );
  
  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="space-y-1">
          <h4 className="font-medium">Criar Sub-rede para esta VLAN</h4>
          <p className="text-sm text-muted-foreground">
            Associe uma faixa de IP automaticamente a esta VLAN
          </p>
        </div>
        <Switch
          checked={createSubnet}
          onCheckedChange={setCreateSubnet}
        />
      </div>
      
      {createSubnet && (
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="flex items-center gap-2 text-primary">
            <Plus className="h-4 w-4" />
            <span className="font-medium">Nova Sub-rede</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subnet-name">Nome da Sub-rede *</Label>
              <Input
                id="subnet-name"
                placeholder="Ex: SUB_FINANCEIRO"
                value={subnetName}
                onChange={(e) => setSubnetName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cidr">CIDR (IPv4/IPv6) *</Label>
              <Input
                id="cidr"
                placeholder="192.168.10.0/24"
                value={cidr}
                onChange={(e) => setCidr(e.target.value)}
              />
              {cidrError && (
                <p className="text-sm text-destructive">{cidrError}</p>
              )}
            </div>
          </div>
          
          {cidr && !cidrError && (
            <div className="text-sm text-muted-foreground">
              {(() => {
                const parsed = parseCIDR(cidr);
                if (parsed) {
                  return (
                    <div className="flex gap-4">
                      <span>Rede: {parsed.networkAddress}</span>
                      <span>Gateway: {parsed.gatewayAddress || '-'}</span>
                      <span>IPs utilizáveis: {parsed.usableAddresses.toLocaleString()}</span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          )}
        </div>
      )}
      
      {!createSubnet && (
        <div className="text-center py-8 text-muted-foreground">
          <Network className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Você pode associar sub-redes posteriormente</p>
        </div>
      )}
    </div>
  );
  
  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="p-4 bg-muted/50 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">VLAN ID:</span>
          <Badge variant="secondary" className="text-lg">{vlanId}</Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Nome:</span>
          <span className="font-medium">{name}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Categoria:</span>
          <div className="flex items-center gap-2">
            {getCategoryIcon(category)}
            <span>{selectedCategory?.label}</span>
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: selectedCategory?.color }}
            />
          </div>
        </div>
        
        {buildingId && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Prédio:</span>
            <span>{buildings?.find(b => b.id === buildingId)?.name}</span>
          </div>
        )}
        
        {description && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Descrição:</span>
            <span className="text-right max-w-[60%]">{description}</span>
          </div>
        )}
      </div>
      
      {createSubnet && cidr && (
        <div className="p-4 border border-primary/20 bg-primary/5 rounded-lg space-y-2">
          <div className="flex items-center gap-2 text-primary font-medium">
            <Network className="h-4 w-4" />
            <span>Sub-rede a ser criada</span>
          </div>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nome:</span>
              <span>{subnetName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">CIDR:</span>
              <span className="font-mono">{cidr}</span>
            </div>
          </div>
        </div>
      )}
      
      {vlanIdWarning && (
        <Alert variant="default">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{vlanIdWarning}</AlertDescription>
        </Alert>
      )}
    </div>
  );
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar Nova VLAN</DialogTitle>
        </DialogHeader>
        
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 py-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                s === step
                  ? 'bg-primary text-primary-foreground'
                  : s < step
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {s < step ? <Check className="h-4 w-4" /> : s}
            </div>
          ))}
        </div>
        
        <div className="text-center text-sm text-muted-foreground mb-4">
          {step === 1 && 'Dados Básicos'}
          {step === 2 && 'Faixa de IP (Opcional)'}
          {step === 3 && 'Confirmação'}
        </div>
        
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        
        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={() => setStep((s) => (s - 1) as WizardStep)}
            disabled={step === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          
          {step < 3 ? (
            <Button
              onClick={() => setStep((s) => (s + 1) as WizardStep)}
              disabled={(step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2)}
            >
              Próximo
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? 'Criando...' : 'Criar VLAN'}
              <Check className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
