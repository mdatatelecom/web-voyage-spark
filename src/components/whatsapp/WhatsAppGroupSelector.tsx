import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, Users, User, AlertTriangle, Wifi } from 'lucide-react';
import { useWhatsAppGroups, type WhatsAppGroup } from '@/hooks/useWhatsAppGroups';
import type { WhatsAppSettings } from '@/hooks/useWhatsAppSettings';
import { useToast } from '@/hooks/use-toast';

interface WhatsAppGroupSelectorProps {
  settings: WhatsAppSettings;
  onSettingsChange: (settings: WhatsAppSettings) => void;
  disabled?: boolean;
  onReconnectRequest?: () => void;
}

export const WhatsAppGroupSelector = ({
  settings,
  onSettingsChange,
  disabled = false,
  onReconnectRequest,
}: WhatsAppGroupSelectorProps) => {
  const { toast } = useToast();
  const { groups, isLoading, listGroups } = useWhatsAppGroups();
  const [hasLoadedGroups, setHasLoadedGroups] = useState(false);
  const [needsReconnect, setNeedsReconnect] = useState(false);

  const handleLoadGroups = async () => {
    if (settings.evolutionApiUrl && settings.evolutionApiKey && settings.evolutionInstance) {
      setNeedsReconnect(false);
      const result = await listGroups(
        settings.evolutionApiUrl,
        settings.evolutionApiKey,
        settings.evolutionInstance
      );
      setHasLoadedGroups(true);
      
      // Check if the response indicates reconnection is needed
      if (result && typeof result === 'object' && 'needsReconnect' in result && result.needsReconnect) {
        setNeedsReconnect(true);
        toast({
          title: 'Reconexão necessária',
          description: 'A instância do WhatsApp precisa ser reconectada para listar grupos.',
          variant: 'destructive',
        });
      }
    }
  };

  // Auto-load groups when user selects "group" target type and instance is connected
  useEffect(() => {
    if (
      settings.targetType === 'group' && 
      settings.evolutionInstance && 
      settings.evolutionApiUrl && 
      settings.evolutionApiKey &&
      !hasLoadedGroups &&
      !isLoading
    ) {
      console.log('Auto-loading groups for instance:', settings.evolutionInstance);
      handleLoadGroups();
    }
  }, [settings.targetType, settings.evolutionInstance, settings.evolutionApiUrl, settings.evolutionApiKey]);

  const handleTargetTypeChange = (value: 'individual' | 'group') => {
    onSettingsChange({
      ...settings,
      targetType: value,
      selectedGroupId: value === 'individual' ? null : settings.selectedGroupId,
      selectedGroupName: value === 'individual' ? null : settings.selectedGroupName,
    });
  };

  const handleGroupSelect = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    onSettingsChange({
      ...settings,
      selectedGroupId: groupId,
      selectedGroupName: group?.subject || null,
    });
  };

  const isInstanceConnected = !!settings.evolutionInstance;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Tipo de Destino para Notificações</Label>
        <RadioGroup
          value={settings.targetType || 'individual'}
          onValueChange={(value) => handleTargetTypeChange(value as 'individual' | 'group')}
          disabled={disabled || !isInstanceConnected}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="individual" id="target-individual" />
            <Label htmlFor="target-individual" className="flex items-center gap-2 cursor-pointer">
              <User className="w-4 h-4" />
              Individual
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="group" id="target-group" />
            <Label htmlFor="target-group" className="flex items-center gap-2 cursor-pointer">
              <Users className="w-4 h-4" />
              Grupo
            </Label>
          </div>
        </RadioGroup>
        <p className="text-xs text-muted-foreground">
          {settings.targetType === 'group' 
            ? 'As notificações serão enviadas para o grupo selecionado' 
            : 'As notificações serão enviadas individualmente para cada telefone configurado'}
        </p>
      </div>

      {settings.targetType === 'group' && (
        <div className="space-y-2">
          <Label>Grupo para Notificações</Label>
          
          {needsReconnect && (
            <Alert variant="destructive" className="mb-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Instância desconectada. Reconecte para listar grupos.</span>
                {onReconnectRequest && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onReconnectRequest}
                    className="ml-2 h-7 text-xs"
                  >
                    <Wifi className="h-3 w-3 mr-1" />
                    Reconectar
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex gap-2">
            <Select
              value={settings.selectedGroupId || ''}
              onValueChange={handleGroupSelect}
              disabled={disabled || !isInstanceConnected || needsReconnect}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecione um grupo" />
              </SelectTrigger>
              <SelectContent>
                {groups.length > 0 ? (
                  groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="truncate">{group.subject}</span>
                        <Badge variant="secondary" className="text-xs ml-auto">
                          {group.size} membros
                        </Badge>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="_empty" disabled>
                    {needsReconnect
                      ? 'Reconecte a instância para listar grupos'
                      : hasLoadedGroups 
                        ? 'Nenhum grupo encontrado' 
                        : 'Clique em "Buscar" para listar grupos'}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleLoadGroups}
              disabled={disabled || !isInstanceConnected || isLoading}
              title="Buscar grupos disponíveis"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
          {settings.selectedGroupName && (
            <p className="text-xs text-muted-foreground">
              Grupo selecionado: <span className="font-medium">{settings.selectedGroupName}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
};
