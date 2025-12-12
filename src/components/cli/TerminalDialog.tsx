import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useVpnSettings } from '@/hooks/useVpnSettings';
import { Terminal, Maximize2, Minimize2, X, Copy, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TerminalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'system';
  content: string;
  timestamp: Date;
}

export const TerminalDialog = ({ open, onOpenChange }: TerminalDialogProps) => {
  const { toast } = useToast();
  const { vpnSettings, isLoading } = useVpnSettings();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentInput, setCurrentInput] = useState('');
  const [history, setHistory] = useState<TerminalLine[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addLine = useCallback((type: TerminalLine['type'], content: string) => {
    setHistory(prev => [...prev, { type, content, timestamp: new Date() }]);
  }, []);

  const scrollToBottom = useCallback(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [history, scrollToBottom]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open, isConnected]);

  const handleConnect = async () => {
    if (!vpnSettings.vpnHost) {
      addLine('error', 'Erro: Configure o endereço VPN em Sistema > VPN antes de conectar.');
      return;
    }

    setIsConnecting(true);
    addLine('system', `Conectando a ${vpnSettings.vpnHost}:${vpnSettings.sshPort}...`);
    
    // Simulated connection (in a real app, this would use WebSocket to a backend SSH proxy)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    addLine('system', `Conectado como ${vpnSettings.vpnUser}@${vpnSettings.vpnHost}`);
    addLine('system', 'Terminal pronto. Digite "help" para comandos disponíveis.');
    addLine('output', '');
    setIsConnected(true);
    setIsConnecting(false);
  };

  const handleDisconnect = () => {
    addLine('system', 'Conexão encerrada.');
    setIsConnected(false);
    setHistory([]);
  };

  const processCommand = (cmd: string) => {
    const trimmedCmd = cmd.trim().toLowerCase();
    
    // Simulated command responses
    const commands: Record<string, () => string> = {
      'help': () => `Comandos disponíveis:
  help      - Mostra esta ajuda
  clear     - Limpa o terminal
  whoami    - Mostra usuário atual
  hostname  - Mostra o nome do host
  uptime    - Mostra tempo de atividade
  date      - Mostra data e hora
  ip        - Mostra informações de rede
  ping      - Testa conectividade
  exit      - Desconecta do terminal`,
      'clear': () => {
        setHistory([]);
        return '';
      },
      'whoami': () => vpnSettings.vpnUser || 'user',
      'hostname': () => vpnSettings.vpnHost || 'localhost',
      'uptime': () => ' 12:34:56 up 45 days, 3:21, 1 user, load average: 0.08, 0.12, 0.10',
      'date': () => new Date().toLocaleString('pt-BR'),
      'ip': () => `inet ${vpnSettings.vpnHost}  netmask 255.255.255.0  broadcast ${vpnSettings.vpnHost?.split('.').slice(0, 3).join('.')}.255`,
      'ping': () => `PING ${vpnSettings.vpnHost} (${vpnSettings.vpnHost}): 56 data bytes
64 bytes from ${vpnSettings.vpnHost}: icmp_seq=0 ttl=64 time=0.5 ms
64 bytes from ${vpnSettings.vpnHost}: icmp_seq=1 ttl=64 time=0.4 ms
--- ${vpnSettings.vpnHost} ping statistics ---
2 packets transmitted, 2 packets received, 0% packet loss`,
      'exit': () => {
        handleDisconnect();
        return 'Desconectado.';
      },
    };

    if (commands[trimmedCmd]) {
      return commands[trimmedCmd]();
    }

    return `bash: ${cmd}: comando não encontrado`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentInput.trim()) return;

    const cmd = currentInput.trim();
    addLine('input', `${vpnSettings.vpnUser}@${vpnSettings.vpnHost}:~$ ${cmd}`);
    
    setCommandHistory(prev => [...prev, cmd]);
    setHistoryIndex(-1);

    const output = processCommand(cmd);
    if (output) {
      addLine('output', output);
    }

    setCurrentInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setCurrentInput(commandHistory[commandHistory.length - 1 - newIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCurrentInput(commandHistory[commandHistory.length - 1 - newIndex] || '');
      } else {
        setHistoryIndex(-1);
        setCurrentInput('');
      }
    }
  };

  const copyToClipboard = () => {
    const text = history.map(line => line.content).join('\n');
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copiado',
      description: 'Conteúdo do terminal copiado para a área de transferência.',
    });
  };

  const getLineColor = (type: TerminalLine['type']) => {
    switch (type) {
      case 'input': return 'text-green-400';
      case 'output': return 'text-gray-300';
      case 'error': return 'text-red-400';
      case 'system': return 'text-yellow-400';
      default: return 'text-gray-300';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={`${isFullscreen ? 'w-screen h-screen max-w-none m-0 rounded-none' : 'max-w-4xl h-[600px]'} flex flex-col p-0 gap-0 bg-gray-900 border-gray-700`}
      >
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Terminal className="h-5 w-5 text-green-400" />
              <DialogTitle className="text-white">Terminal CLI</DialogTitle>
              {isConnected ? (
                <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500">
                  Conectado
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-gray-500/20 text-gray-400 border-gray-500">
                  Desconectado
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={copyToClipboard}
                className="text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="text-gray-400 hover:text-white hover:bg-gray-800"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Terminal Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-green-400" />
            </div>
          ) : !isConnected ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
              {!vpnSettings.vpnHost ? (
                <>
                  <AlertCircle className="h-16 w-16 text-yellow-400" />
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-white mb-2">VPN não configurada</h3>
                    <p className="text-gray-400">
                      Configure as credenciais VPN em Sistema → VPN antes de conectar.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Terminal className="h-16 w-16 text-green-400" />
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-white mb-2">Terminal SSH</h3>
                    <p className="text-gray-400 mb-4">
                      Conectar a {vpnSettings.vpnHost}:{vpnSettings.sshPort}
                    </p>
                    <Button
                      onClick={handleConnect}
                      disabled={isConnecting}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Conectando...
                        </>
                      ) : (
                        <>
                          <Terminal className="h-4 w-4 mr-2" />
                          Conectar
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Terminal Output */}
              <div
                ref={terminalRef}
                className="flex-1 overflow-y-auto p-4 font-mono text-sm bg-gray-900"
                onClick={() => inputRef.current?.focus()}
              >
                {history.map((line, index) => (
                  <div key={index} className={`${getLineColor(line.type)} whitespace-pre-wrap`}>
                    {line.content}
                  </div>
                ))}
              </div>

              {/* Input Line */}
              <form onSubmit={handleSubmit} className="flex-shrink-0 border-t border-gray-700 p-2">
                <div className="flex items-center gap-2 font-mono text-sm">
                  <span className="text-green-400">
                    {vpnSettings.vpnUser}@{vpnSettings.vpnHost}:~$
                  </span>
                  <Input
                    ref={inputRef}
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-transparent border-none text-white focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto"
                    placeholder=""
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
              </form>

              {/* Status Bar */}
              <div className="flex-shrink-0 px-4 py-2 bg-gray-800 border-t border-gray-700 flex items-center justify-between text-xs text-gray-400">
                <span>SSH • {vpnSettings.vpnHost}:{vpnSettings.sshPort}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDisconnect}
                  className="h-6 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20"
                >
                  <X className="h-3 w-3 mr-1" />
                  Desconectar
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
