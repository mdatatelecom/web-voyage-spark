import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBuildings } from '@/hooks/useBuildings';
import { useViaCEP } from '@/hooks/useViaCEP';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BUILDING_TYPES, BRAZILIAN_STATES, getBuildingFieldConfig } from '@/constants/locationTypes';
import { ChevronLeft, ChevronRight, Loader2, Navigation, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BuildingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buildingId?: string;
}

interface BuildingFormData {
  name: string;
  internal_code?: string;
  building_type?: string;
  address?: string;
  zip_code?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  notes?: string;
}

export const BuildingWizard = ({ open, onOpenChange, buildingId }: BuildingWizardProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const { createBuilding, updateBuilding, isCreating, isUpdating } = useBuildings();
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<BuildingFormData>();
  const { fetchAddress, isLoading: isFetchingCEP } = useViaCEP();

  const buildingType = watch('building_type');
  const state = watch('state');

  // Configuração dinâmica de campos baseada no tipo de edificação
  const fieldConfig = useMemo(() => getBuildingFieldConfig(buildingType), [buildingType]);

  // Steps dinâmicos baseados no tipo de edificação
  const steps = useMemo(() => {
    const baseSteps = [
      { id: 1, title: 'Tipo e Nome', description: 'Identificação' },
    ];

    if (fieldConfig.showFullAddress) {
      baseSteps.push({ 
        id: 2, 
        title: 'Localização', 
        description: fieldConfig.showCoordinates ? 'Endereço e GPS' : 'Endereço' 
      });
    }

    if (fieldConfig.showContact) {
      baseSteps.push({ 
        id: baseSteps.length + 1, 
        title: 'Contato', 
        description: 'Responsável' 
      });
    }

    return baseSteps;
  }, [fieldConfig]);

  const totalSteps = steps.length;

  const { data: building } = useQuery({
    queryKey: ['building', buildingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .eq('id', buildingId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!buildingId,
  });

  useEffect(() => {
    if (building) {
      reset({
        name: building.name,
        internal_code: building.internal_code || '',
        building_type: building.building_type || '',
        address: building.address || '',
        zip_code: building.zip_code || '',
        city: building.city || '',
        state: building.state || '',
        latitude: building.latitude || undefined,
        longitude: building.longitude || undefined,
        contact_name: building.contact_name || '',
        contact_phone: building.contact_phone || '',
        contact_email: building.contact_email || '',
        notes: '',
      });
    } else {
      reset({
        name: '',
        internal_code: '',
        building_type: '',
        address: '',
        zip_code: '',
        city: '',
        state: '',
        contact_name: '',
        contact_phone: '',
        contact_email: '',
        notes: '',
      });
    }
    setCurrentStep(1);
  }, [building, reset, open]);

  const onSubmit = (data: BuildingFormData) => {
    const formData = {
      ...data,
      latitude: data.latitude ? Number(data.latitude) : null,
      longitude: data.longitude ? Number(data.longitude) : null,
    };

    if (buildingId) {
      updateBuilding({ id: buildingId, ...formData });
    } else {
      createBuilding(formData);
    }
    onOpenChange(false);
    reset();
    setCurrentStep(1);
  };

  const handleNext = () => {
    if (currentStep < totalSteps) setCurrentStep(currentStep + 1);
  };

  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const canGoNext = () => {
    if (currentStep === 1) {
      const name = watch('name');
      const type = watch('building_type');
      return name && name.trim() !== '' && type && type.trim() !== '';
    }
    return true;
  };

  // Determina qual step lógico está ativo baseado nos steps dinâmicos
  const isLocationStep = fieldConfig.showFullAddress && currentStep === 2;
  const isContactStep = (fieldConfig.showFullAddress && currentStep === 3) || (!fieldConfig.showFullAddress && currentStep === 2);
  const isLastStep = currentStep === totalSteps;

  const handleCEPChange = async (cep: string) => {
    setValue('zip_code', cep);
    
    // Only fetch if we have 8 digits (ignoring non-numeric)
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      const addressData = await fetchAddress(cep);
      if (addressData) {
        setValue('address', addressData.address);
        setValue('city', addressData.city);
        setValue('state', addressData.state);
      }
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValue('latitude', position.coords.latitude);
        setValue('longitude', position.coords.longitude);
      },
      (error) => {
        console.error('Geolocation error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Obtém o título do local baseado no tipo
  const getLocationTitle = () => {
    const type = BUILDING_TYPES.find(t => t.value === buildingType);
    return type?.label || 'Local';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {buildingId ? `Editar ${getLocationTitle()}` : `Novo ${getLocationTitle()}`}
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    currentStep >= step.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step.id}
                </div>
                <div className="text-xs mt-1 text-center">
                  <div className="font-medium">{step.title}</div>
                  <div className="text-muted-foreground">{step.description}</div>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-2 transition-colors ${
                    currentStep > step.id ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Step 1: Tipo e Nome */}
          {currentStep === 1 && (
            <div className="space-y-4">
              {/* Tipo de Edificação - PRIMEIRO para definir os campos */}
              <div className="space-y-2">
                <Label htmlFor="building_type">Tipo de Edificação *</Label>
                <Select value={buildingType} onValueChange={(value) => setValue('building_type', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUILDING_TYPES.map((type) => {
                      const Icon = type.icon;
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Alerta informativo sobre campos condicionais */}
              {buildingType && (
                <Alert className="bg-muted/50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {buildingType === 'residence' && 'Formulário simplificado para residências.'}
                    {buildingType === 'office' && 'Escritórios não requerem coordenadas GPS.'}
                    {buildingType === 'warehouse' && 'Galpões usam setores ao invés de andares.'}
                    {(buildingType === 'commercial_building' || buildingType === 'condominium') && 
                      'Formulário completo com andares e coordenadas GPS.'}
                    {buildingType === 'other' && 'Configure conforme necessário.'}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  {...register('name', { required: 'Nome é obrigatório' })}
                  placeholder={fieldConfig.placeholders.name}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              {/* Código Interno - condicional */}
              {fieldConfig.showInternalCode && (
                <div className="space-y-2">
                  <Label htmlFor="internal_code">Código Interno</Label>
                  <Input
                    id="internal_code"
                    {...register('internal_code')}
                    placeholder={fieldConfig.placeholders.internalCode}
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 2: Localização (se aplicável) */}
          {isLocationStep && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="zip_code">CEP</Label>
                <div className="relative">
                  <Input
                    id="zip_code"
                    {...register('zip_code')}
                    placeholder="00000-000"
                    maxLength={9}
                    onChange={(e) => handleCEPChange(e.target.value)}
                  />
                  {isFetchingCEP && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Digite o CEP para preencher automaticamente o endereço
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">
                  Endereço Completo
                  {fieldConfig.requiredFields.includes('address') && ' *'}
                </Label>
                <Input
                  id="address"
                  {...register('address')}
                  placeholder="Rua, número, complemento"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">
                    Cidade
                    {fieldConfig.requiredFields.includes('city') && ' *'}
                  </Label>
                  <Input
                    id="city"
                    {...register('city')}
                    placeholder="São Paulo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">
                    Estado
                    {fieldConfig.requiredFields.includes('state') && ' *'}
                  </Label>
                  <Select value={state} onValueChange={(value) => setValue('state', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {BRAZILIAN_STATES.map((st) => (
                        <SelectItem key={st.value} value={st.value}>
                          {st.value} - {st.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Coordenadas GPS - condicional */}
              {fieldConfig.showCoordinates && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Coordenadas GPS (opcional)</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGetCurrentLocation}
                    >
                      <Navigation className="mr-2 h-4 w-4" />
                      Usar minha localização
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Input
                        {...register('latitude')}
                        type="number"
                        step="0.00000001"
                        placeholder="Latitude: -23.5505"
                      />
                    </div>
                    <div>
                      <Input
                        {...register('longitude')}
                        type="number"
                        step="0.00000001"
                        placeholder="Longitude: -46.6333"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step: Contato (último step quando aplicável) */}
          {isContactStep && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contact_name">Responsável / Contato</Label>
                <Input
                  id="contact_name"
                  {...register('contact_name')}
                  placeholder="Nome do responsável"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Telefone</Label>
                  <Input
                    id="contact_phone"
                    {...register('contact_phone')}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_email">E-mail</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    {...register('contact_email')}
                    placeholder="contato@exemplo.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  {...register('notes')}
                  placeholder={fieldConfig.placeholders.notes}
                  rows={4}
                />
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>

            {!isLastStep ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={!canGoNext()}
              >
                Próximo
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={isCreating || isUpdating}>
                {isCreating || isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  buildingId ? 'Salvar' : 'Criar'
                )}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
