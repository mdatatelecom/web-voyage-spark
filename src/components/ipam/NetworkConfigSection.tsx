import { Network } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { VlanSelector } from './VlanSelector';
import { IPSelector } from './IPSelector';

interface NetworkConfigSectionProps {
  vlanUuid: string;
  onVlanChange: (vlanId: string, vlanUuid: string | null) => void;
  ipAddress: string;
  onIPChange: (ip: string, ipId: string | null) => void;
  hostname?: string;
  onHostnameChange?: (hostname: string) => void;
  macAddress?: string;
  onMacChange?: (mac: string) => void;
  showHostname?: boolean;
  showMac?: boolean;
  disabled?: boolean;
  title?: string;
  className?: string;
}

export function NetworkConfigSection({
  vlanUuid,
  onVlanChange,
  ipAddress,
  onIPChange,
  hostname = '',
  onHostnameChange,
  macAddress = '',
  onMacChange,
  showHostname = true,
  showMac = true,
  disabled = false,
  title = 'Configuração de Rede',
  className = '',
}: NetworkConfigSectionProps) {
  
  const formatMacAddress = (value: string) => {
    // Remove non-hex characters
    const cleaned = value.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
    // Add colons every 2 characters
    const formatted = cleaned.match(/.{1,2}/g)?.join(':') || cleaned;
    return formatted.slice(0, 17); // Max length: XX:XX:XX:XX:XX:XX
  };

  const handleMacChange = (value: string) => {
    if (onMacChange) {
      onMacChange(formatMacAddress(value));
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {title && (
        <h4 className="font-medium flex items-center gap-2 text-foreground">
          <Network className="w-4 h-4" />
          {title}
        </h4>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* VLAN Selector */}
        <div className="space-y-2">
          <Label>VLAN (opcional)</Label>
          <VlanSelector
            value={vlanUuid || undefined}
            onChange={(vlanId, uuid) => {
              onVlanChange(vlanId?.toString() || '', uuid);
              // Clear IP when VLAN changes
              onIPChange('', null);
            }}
            disabled={disabled}
            showNoneAsFilter={true}
          />
        </div>

        {/* IP Address Selector */}
        <div className="space-y-2">
          <Label>Endereço IP</Label>
          <IPSelector
            value={ipAddress}
            onChange={(ip, ipId) => onIPChange(ip, ipId)}
            vlanUuid={vlanUuid || undefined}
            placeholder={vlanUuid ? "Selecione um IP da VLAN" : "Selecione ou digite um IP"}
            allowManual={true}
            disabled={disabled}
          />
        </div>

        {/* Hostname */}
        {showHostname && onHostnameChange && (
          <div className="space-y-2">
            <Label>Hostname</Label>
            <Input
              value={hostname}
              onChange={(e) => onHostnameChange(e.target.value)}
              placeholder="Ex: srv-db-01"
              disabled={disabled}
            />
          </div>
        )}

        {/* MAC Address */}
        {showMac && onMacChange && (
          <div className="space-y-2">
            <Label>MAC Address</Label>
            <Input
              value={macAddress}
              onChange={(e) => handleMacChange(e.target.value)}
              placeholder="XX:XX:XX:XX:XX:XX"
              disabled={disabled}
              maxLength={17}
            />
          </div>
        )}
      </div>
    </div>
  );
}
