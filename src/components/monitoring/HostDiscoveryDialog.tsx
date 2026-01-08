import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Server, Plus, CheckCircle, XCircle } from 'lucide-react';
import { useHostDiscovery, DiscoveredHost } from '@/hooks/useHostDiscovery';
import { ScrollArea } from '@/components/ui/scroll-area';

interface HostDiscoveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectHost: (host: string, serverAddress: string, apiToken: string) => void;
}

export function HostDiscoveryDialog({ open, onOpenChange, onSelectHost }: HostDiscoveryDialogProps) {
  const [serverAddress, setServerAddress] = useState('86.48.3.172:3000');
  const [apiToken, setApiToken] = useState('');
  const [serverStatus, setServerStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  const { isDiscovering, isTesting, discoveredHosts, testServerConnection, discoverHosts } = useHostDiscovery();

  const handleTestServer = async () => {
    const result = await testServerConnection(serverAddress, apiToken);
    setServerStatus(result.success ? 'success' : 'error');
  };

  const handleDiscover = async () => {
    await discoverHosts(serverAddress, apiToken);
  };

  const handleSelectHost = (host: string) => {
    onSelectHost(host, serverAddress, apiToken);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Descobrir Hosts SNMP
          </DialogTitle>
          <DialogDescription>
            Conecte ao servidor de monitoramento para listar hosts disponíveis
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Server Configuration */}
          <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
            <div className="space-y-2">
              <Label htmlFor="server">Endereço do Servidor</Label>
              <div className="flex gap-2">
                <Input
                  id="server"
                  value={serverAddress}
                  onChange={(e) => setServerAddress(e.target.value)}
                  placeholder="ip:porta"
                />
                <Button
                  variant="outline"
                  onClick={handleTestServer}
                  disabled={isTesting || !serverAddress}
                >
                  {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Server className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="token">Token da API</Label>
              <Input
                id="token"
                type="password"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="Token de autenticação"
              />
            </div>

            {serverStatus !== 'idle' && (
              <div className={`flex items-center gap-2 text-sm ${serverStatus === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {serverStatus === 'success' ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Servidor conectado
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    Falha na conexão
                  </>
                )}
              </div>
            )}
          </div>

          {/* Discover Button */}
          <Button
            onClick={handleDiscover}
            disabled={isDiscovering || !serverAddress}
            className="w-full"
          >
            {isDiscovering ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Descobrindo...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Descobrir Hosts
              </>
            )}
          </Button>

          {/* Discovered Hosts */}
          {discoveredHosts.length > 0 && (
            <div className="space-y-2">
              <Label>Hosts Encontrados ({discoveredHosts.length})</Label>
              <ScrollArea className="h-48 rounded-md border">
                <div className="p-2 space-y-2">
                  {discoveredHosts.map((host, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Server className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{host.host}</p>
                          {host.status && (
                            <Badge variant={host.status === 'online' ? 'default' : 'secondary'} className="text-xs">
                              {host.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSelectHost(host.host)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Usar
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {discoveredHosts.length === 0 && !isDiscovering && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Clique em "Descobrir Hosts" para listar os hosts disponíveis no servidor
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
