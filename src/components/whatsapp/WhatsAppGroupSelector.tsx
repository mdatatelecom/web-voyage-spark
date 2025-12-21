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
import { Loader2, RefreshCw, Users, User } from 'lucide-react';
import { useWhatsAppGroups, type WhatsAppGroup } from '@/hooks/useWhatsAppGroups';
import type { WhatsAppSettings } from '@/hooks/useWhatsAppSettings';

interface WhatsAppGroupSelectorProps {
  settings: WhatsAppSettings;
  onSettingsChange: (settings: WhatsAppSettings) => void;
  disabled?: boolean;
}

export const WhatsAppGroupSelector = ({
  settings,
  onSettingsChange,
  disabled = false,
}: WhatsAppGroupSelectorProps) => {
  const { groups, isLoading, listGroups } = useWhatsAppGroups();
  const [hasLoadedGroups, setHasLoadedGroups] = useState(false);

  const handleLoadGroups = async () => {
    if (settings.evolutionApiUrl && settings.evolutionApiKey && settings.evolutionInstance) {
      await listGroups(
        settings.evolutionApiUrl,
        settings.evolutionApiKey,
        settings.evolutionInstance
      );
      setHasLoadedGroups(true);
    }
  };

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
          <div className="flex gap-2">
            <Select
              value={settings.selectedGroupId || ''}
              onValueChange={handleGroupSelect}
              disabled={disabled || !isInstanceConnected}
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
                    {hasLoadedGroups 
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
