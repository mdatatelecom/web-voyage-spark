import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, RefreshCw, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
import { useZabbixHosts, CachedZabbixHost } from '@/hooks/useZabbixHosts';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

interface ZabbixHostSelectorProps {
  value?: string;
  onChange: (hostId: string, host?: CachedZabbixHost) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ZabbixHostSelector({ 
  value, 
  onChange, 
  disabled = false,
  placeholder = "Selecione um host do Zabbix" 
}: ZabbixHostSelectorProps) {
  const { hosts, isLoading, syncHosts, isSyncing, getHostById, lastSyncTime } = useZabbixHosts();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const selectedHost = value ? getHostById(value) : undefined;

  const filteredHosts = hosts.filter(host => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      host.host_name.toLowerCase().includes(term) ||
      host.host_display_name?.toLowerCase().includes(term) ||
      host.host_id.includes(term)
    );
  });

  // Get IP from first interface
  const getHostIP = (host: CachedZabbixHost): string => {
    const interfaces = host.interfaces as any[] || [];
    const firstInterface = interfaces.find(i => i.ip);
    return firstInterface?.ip || 'N/A';
  };

  // Format last sync time
  const formatSyncTime = () => {
    if (!lastSyncTime) return 'Nunca sincronizado';
    const date = new Date(lastSyncTime);
    return `Última sync: ${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <TooltipProvider>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn(
                "w-full justify-between",
                !value && "text-muted-foreground"
              )}
              disabled={disabled || isLoading}
            >
              {selectedHost ? (
                <div className="flex items-center gap-2 truncate">
                  <span className="truncate">{selectedHost.host_display_name || selectedHost.host_name}</span>
                  <Badge variant="outline" className="text-xs">
                    {getHostIP(selectedHost)}
                  </Badge>
                </div>
              ) : (
                placeholder
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command shouldFilter={false}>
              <div className="flex items-center border-b px-3">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <input
                  className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Buscar host..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <CommandList>
                {isLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="ml-2 text-sm text-muted-foreground">Carregando...</span>
                  </div>
                ) : filteredHosts.length === 0 ? (
                  <CommandEmpty>
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">Nenhum host encontrado</p>
                      <Button 
                        variant="link" 
                        size="sm" 
                        onClick={() => syncHosts()}
                        disabled={isSyncing}
                      >
                        Sincronizar hosts do Zabbix
                      </Button>
                    </div>
                  </CommandEmpty>
                ) : (
                  <CommandGroup>
                    {filteredHosts.map((host) => {
                      const groups = (host.groups as any[]) || [];
                      return (
                        <CommandItem
                          key={host.host_id}
                          value={host.host_id}
                          onSelect={() => {
                            onChange(host.host_id, host);
                            setOpen(false);
                          }}
                          className="flex items-center justify-between"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {host.host_display_name || host.host_name}
                            </span>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{host.host_name}</span>
                              <span>•</span>
                              <span>{getHostIP(host)}</span>
                              {groups.length > 0 && (
                                <>
                                  <span>•</span>
                                  <span>{groups[0]?.name}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={host.status === 'enabled' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {host.status === 'enabled' ? 'Ativo' : 'Inativo'}
                            </Badge>
                            <Check
                              className={cn(
                                "h-4 w-4",
                                value === host.host_id ? "opacity-100" : "opacity-0"
                              )}
                            />
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}
              </CommandList>
              
              {/* Footer with sync info */}
              <div className="border-t p-2 flex items-center justify-between bg-muted/50">
                <span className="text-xs text-muted-foreground">
                  {formatSyncTime()}
                </span>
                <span className="text-xs text-muted-foreground">
                  {hosts.length} host(s)
                </span>
              </div>
            </Command>
          </PopoverContent>
        </Popover>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={() => syncHosts()}
              disabled={isSyncing || disabled}
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Sincronizar hosts do Zabbix
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
