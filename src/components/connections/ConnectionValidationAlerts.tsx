import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, XCircle, Lightbulb, Zap, HardDrive, Cable } from 'lucide-react';
import { ValidationError, ConnectionValidationResult } from '@/hooks/useConnectionValidation';
import { Database } from '@/integrations/supabase/types';
import { CABLE_TYPES } from '@/constants/cables';

type CableType = Database['public']['Enums']['cable_type'];

interface ConnectionValidationAlertsProps {
  validation: ConnectionValidationResult;
  onApplySuggestion?: (cableType: CableType) => void;
}

const getIcon = (type: ValidationError['type']) => {
  switch (type) {
    case 'nvr_channel':
      return <HardDrive className="w-4 h-4" />;
    case 'poe_budget':
      return <Zap className="w-4 h-4" />;
    case 'cable_compatibility':
      return <Cable className="w-4 h-4" />;
    default:
      return <AlertTriangle className="w-4 h-4" />;
  }
};

export function ConnectionValidationAlerts({ 
  validation, 
  onApplySuggestion 
}: ConnectionValidationAlertsProps) {
  const { errors, warnings, suggestedCable } = validation;

  if (errors.length === 0 && warnings.length === 0 && !suggestedCable) {
    return null;
  }

  const suggestedCableLabel = suggestedCable 
    ? CABLE_TYPES.find(t => t.value === suggestedCable)?.label 
    : null;

  return (
    <div className="space-y-3">
      {/* Erros bloqueantes */}
      {errors.map((error, idx) => (
        <Alert key={`error-${idx}`} variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle className="flex items-center gap-2">
            {getIcon(error.type)}
            {error.type === 'nvr_channel' && 'NVR/DVR sem Canais'}
            {error.type === 'poe_budget' && 'Budget PoE Insuficiente'}
            {error.type === 'cable_compatibility' && 'Cabo Incompatível'}
            {error.type === 'port_invalid' && 'Porta Inválida'}
          </AlertTitle>
          <AlertDescription>
            {error.message}
            
            {error.type === 'cable_compatibility' && suggestedCable && onApplySuggestion && (
              <div className="mt-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onApplySuggestion(suggestedCable)}
                  className="text-xs"
                >
                  <Lightbulb className="w-3 h-3 mr-1" />
                  Usar {suggestedCableLabel}
                </Button>
              </div>
            )}
          </AlertDescription>
        </Alert>
      ))}

      {/* Avisos não bloqueantes */}
      {warnings.map((warning, idx) => (
        <Alert key={`warning-${idx}`} className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
            {getIcon(warning.type)}
            {warning.type === 'nvr_channel' && 'Canais Limitados'}
            {warning.type === 'poe_budget' && 'Atenção ao PoE'}
            {warning.type === 'cable_compatibility' && 'Verificar Cabo'}
            {warning.type === 'port_invalid' && 'Verificar Porta'}
          </AlertTitle>
          <AlertDescription className="text-yellow-700 dark:text-yellow-300">
            {warning.message}
          </AlertDescription>
        </Alert>
      ))}

      {/* Sugestão de cabo (quando não há erros) */}
      {suggestedCable && errors.length === 0 && onApplySuggestion && (
        <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
          <Lightbulb className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800 dark:text-blue-200">Sugestão de Cabo</AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-300">
            <div className="flex items-center justify-between">
              <span>Baseado nas portas, sugerimos: <strong>{suggestedCableLabel}</strong></span>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onApplySuggestion(suggestedCable)}
                className="text-xs ml-2"
              >
                Aplicar
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Info de NVR quando disponível */}
      {validation.nvrInfo && validation.nvrInfo.availableChannels > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <HardDrive className="w-4 h-4" />
          <span>
            NVR: {validation.nvrInfo.usedChannels}/{validation.nvrInfo.totalChannels} canais ocupados 
            ({validation.nvrInfo.availableChannels} disponíveis)
          </span>
        </div>
      )}

      {/* Info de PoE quando relevante */}
      {validation.poeInfo && validation.poeInfo.required > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Zap className="w-4 h-4" />
          <span>
            PoE necessário: {validation.poeInfo.required}W
            {validation.poeInfo.available > 0 && ` (${validation.poeInfo.available}W disponível)`}
          </span>
          {validation.poeInfo.sufficient && (
            <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
              OK
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
