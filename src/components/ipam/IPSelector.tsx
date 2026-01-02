import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, X, Search, Network } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useIPSearch, useAvailableIPs } from '@/hooks/useIPAddresses';
import { validateIPAddress } from '@/lib/cidr-utils';

interface IPSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  allowManual?: boolean;
  className?: string;
}

export function IPSelector({
  value,
  onChange,
  placeholder = 'Selecione ou digite um IP',
  disabled = false,
  allowManual = true,
  className
}: IPSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [manualValue, setManualValue] = useState(value);
  const [manualError, setManualError] = useState<string | null>(null);

  const { data: searchResults = [] } = useIPSearch(search);
  const { data: availableIPs = [] } = useAvailableIPs();

  // Combine available IPs with search results
  const displayIPs = search.length >= 2 
    ? searchResults.filter(ip => ip.status === 'available')
    : availableIPs;

  useEffect(() => {
    setManualValue(value);
  }, [value]);

  const handleManualChange = (newValue: string) => {
    setManualValue(newValue);
    
    if (!newValue) {
      setManualError(null);
      onChange('');
      return;
    }

    const validation = validateIPAddress(newValue);
    if (validation.valid) {
      setManualError(null);
      onChange(newValue);
    } else {
      setManualError(validation.error || 'IP inválido');
    }
  };

  const handleSelectIP = (ip: string) => {
    onChange(ip);
    setSearch('');
    setOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setManualValue('');
    setManualError(null);
  };

  if (manualMode && allowManual) {
    return (
      <div className={cn('space-y-1', className)}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              value={manualValue}
              onChange={(e) => handleManualChange(e.target.value)}
              placeholder="Digite o IP manualmente"
              className={cn(
                'font-mono',
                manualError && 'border-destructive'
              )}
              disabled={disabled}
            />
            {manualValue && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={handleClear}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setManualMode(false)}
          >
            <Search className="h-4 w-4 mr-1" />
            Buscar
          </Button>
        </div>
        {manualError && (
          <p className="text-xs text-destructive">{manualError}</p>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'flex-1 justify-between font-mono',
              !value && 'text-muted-foreground'
            )}
            disabled={disabled}
          >
            {value || placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Buscar IP ou nome..." 
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>
                <div className="p-4 text-center text-sm">
                  <p className="text-muted-foreground mb-2">
                    Nenhum IP disponível encontrado
                  </p>
                  {allowManual && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setManualMode(true);
                        setOpen(false);
                      }}
                    >
                      Digitar manualmente
                    </Button>
                  )}
                </div>
              </CommandEmpty>
              <CommandGroup heading="IPs Disponíveis">
                {displayIPs.slice(0, 50).map((ip) => (
                  <CommandItem
                    key={ip.id}
                    value={ip.ip_address}
                    onSelect={() => handleSelectIP(ip.ip_address)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === ip.ip_address ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{ip.ip_address}</span>
                        {ip.name && (
                          <span className="text-muted-foreground text-xs">
                            ({ip.name})
                          </span>
                        )}
                      </div>
                      {'subnet' in ip && ip.subnet && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Network className="h-3 w-3" />
                          {ip.subnet.name}
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className="ml-2">
                      Livre
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleClear}
          disabled={disabled}
        >
          <X className="h-4 w-4" />
        </Button>
      )}

      {allowManual && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setManualMode(true)}
          disabled={disabled}
          title="Digitar manualmente"
        >
          <span className="text-xs font-mono">IP</span>
        </Button>
      )}
    </div>
  );
}
