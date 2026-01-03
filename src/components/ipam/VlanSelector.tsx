import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useVlans, VLAN_CATEGORIES } from '@/hooks/useVlans';
import { VlanWizard } from './VlanWizard';
import { Plus, Network, Monitor, Phone, Settings, Users, Link, Cpu } from 'lucide-react';

interface VlanSelectorProps {
  value?: string;
  onChange: (vlanId: string, vlanUuid: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  showCreateOption?: boolean;
  showNoneAsFilter?: boolean; // When true, "Nenhuma VLAN" returns 'none' for filtering IPs without VLAN
}

const getCategoryIcon = (category: string) => {
  const icons: Record<string, React.ReactNode> = {
    data: <Monitor className="h-3 w-3" />,
    voice: <Phone className="h-3 w-3" />,
    management: <Settings className="h-3 w-3" />,
    guest: <Users className="h-3 w-3" />,
    native: <Link className="h-3 w-3" />,
    iot: <Cpu className="h-3 w-3" />,
  };
  return icons[category] || <Network className="h-3 w-3" />;
};

export function VlanSelector({ 
  value, 
  onChange, 
  placeholder = "Selecione uma VLAN",
  disabled = false,
  showCreateOption = true,
  showNoneAsFilter = false
}: VlanSelectorProps) {
  const { vlans, isLoading } = useVlans();
  const [wizardOpen, setWizardOpen] = useState(false);
  
  const getCategoryColor = (category: string) => {
    return VLAN_CATEGORIES.find(c => c.value === category)?.color || '#6b7280';
  };
  
  const handleChange = (selectedValue: string) => {
    if (selectedValue === 'create_new') {
      setWizardOpen(true);
      return;
    }
    
    if (selectedValue === 'none') {
      // When showNoneAsFilter is true, return 'none' to filter IPs without VLAN
      // Otherwise return empty string to show all IPs
      onChange('', showNoneAsFilter ? 'none' : null);
      return;
    }
    
    const selectedVlan = vlans.find(v => v.id === selectedValue);
    if (selectedVlan) {
      onChange(selectedVlan.vlan_id.toString(), selectedVlan.id);
    }
  };
  
  const selectedVlan = vlans.find(v => v.id === value);
  
  return (
    <>
      <Select 
        value={value || 'none'} 
        onValueChange={handleChange}
        disabled={disabled || isLoading}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder}>
            {selectedVlan ? (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono">
                  {selectedVlan.vlan_id}
                </Badge>
                <span>{selectedVlan.name}</span>
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: getCategoryColor(selectedVlan.category) }}
                />
              </div>
            ) : (
              placeholder
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <span className="text-muted-foreground">Nenhuma VLAN</span>
          </SelectItem>
          
          {showCreateOption && (
            <SelectItem value="create_new">
              <div className="flex items-center gap-2 text-primary">
                <Plus className="h-4 w-4" />
                <span>Criar nova VLAN...</span>
              </div>
            </SelectItem>
          )}
          
          {vlans.map((vlan) => (
            <SelectItem key={vlan.id} value={vlan.id}>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {vlan.vlan_id}
                </Badge>
                <span>{vlan.name}</span>
                <div className="flex items-center gap-1 ml-auto">
                  {getCategoryIcon(vlan.category)}
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getCategoryColor(vlan.category) }}
                  />
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <VlanWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </>
  );
}
