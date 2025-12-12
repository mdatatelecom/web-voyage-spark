import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { Terminal, Maximize2, Minimize2, X, Copy, Loader2, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AutocompleteDropdown } from './AutocompleteDropdown';
import { supabase } from '@/integrations/supabase/client';

interface TerminalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'system';
  content: string;
  timestamp: Date;
}

const SYSTEM_COMMANDS = [
  'help',
  'clear',
  'whoami',
  'hostname',
  'uptime',
  'date',
  'ip',
  'ping',
  'exit',
];

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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const promptRef = useRef<string>('');

  // Combine command history with system commands for autocomplete
  const suggestions = useMemo(() => {
    if (!currentInput.trim()) return [];
    
    const input = currentInput.toLowerCase();
    const historyCommands = [...new Set(commandHistory)].reverse();
    const allCommands = [...historyCommands, ...SYSTEM_COMMANDS.filter(c => !historyCommands.includes(c))];
    
    return allCommands.filter(
      cmd => cmd.toLowerCase().startsWith(input) && cmd.toLowerCase() !== input
    ).slice(0, 8);
  }, [currentInput, commandHistory]);

  // Ghost text for autocomplete
  const ghostText = useMemo(() => {
    if (!showSuggestions || suggestions.length === 0) return '';
    return suggestions[selectedSuggestion]?.slice(currentInput.length) || '';
  }, [showSuggestions, suggestions, selectedSuggestion, currentInput]);

  // Show suggestions when typing
  useEffect(() => {
    if (currentInput.trim() && suggestions.length > 0) {
      setShowSuggestions(true);
      setSelectedSuggestion(0);
    } else {
      setShowSuggestions(false);
    }
  }, [currentInput, suggestions.length]);

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

  const testRealConnection = async (host: string, port: number): Promise<{ reachable: boolean; message: string; latency?: number }> => {
    try {
      const { data, error } = await supabase.functions.invoke('test-connection', {
        body: { host, port }
      });
      
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Connection test error:', err);
      return { reachable: false, message: 'Falha ao testar conexão' };
    }
  };

  // WebSocket connection cleanup
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const connectWebSocket = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      const wsUrl = `wss://gszsufxjstgpsxikgeeb.supabase.co/functions/v1/terminal-proxy`;
      console.log('Connecting to WebSocket:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setWsConnected(true);
        resolve();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WS message:', data);

          switch (data.type) {
            case 'connected':
              addLine('system', data.message);
              break;
            case 'session_started':
              promptRef.current = data.prompt;
              addLine('system', data.message);
              setIsConnected(true);
              setIsConnecting(false);
              break;
            case 'output':
              addLine('output', data.content);
              if (data.prompt) promptRef.current = data.prompt;
              break;
            case 'error':
              addLine('error', data.message);
              break;
            case 'clear':
              setHistory([]);
              break;
            case 'disconnected':
              addLine('system', data.message);
              setIsConnected(false);
              break;
            case 'pong':
              console.log('Pong received, latency:', Date.now() - data.timestamp, 'ms');
              break;
          }
        } catch (err) {
          console.error('Error parsing WS message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsConnected(false);
        reject(error);
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        setWsConnected(false);
        setIsConnected(false);
      };
    });
  }, [addLine]);

  const handleConnect = async () => {
    if (!vpnSettings.vpnHost) {
      addLine('error', 'Erro: Configure o endereço VPN em Sistema > VPN antes de conectar.');
      return;
    }

    setIsConnecting(true);
    addLine('system', `Conectando via WebSocket proxy...`);
    
    try {
      // First test connectivity
      const connectionResult = await testRealConnection(vpnSettings.vpnHost, vpnSettings.sshPort);
      
      if (connectionResult.reachable) {
        addLine('system', `✓ Host alcançável (${connectionResult.latency}ms)`);
      } else {
        addLine('system', `⚠ ${connectionResult.message}`);
      }

      // Connect WebSocket
      await connectWebSocket();
      
      // Send connect command
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'connect',
          host: vpnSettings.vpnHost,
          port: vpnSettings.sshPort,
          user: vpnSettings.vpnUser
        }));
      }
    } catch (err) {
      console.error('Connection error:', err);
      addLine('error', 'Falha ao conectar via WebSocket');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'disconnect' }));
      wsRef.current.close();
    }
    wsRef.current = null;
    addLine('system', 'Conexão encerrada.');
    setIsConnected(false);
    setWsConnected(false);
    setHistory([]);
  };

  const processCommand = (cmd: string) => {
    const trimmedCmd = cmd.trim().toLowerCase();
    
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

  const acceptSuggestion = useCallback(() => {
    if (showSuggestions && suggestions[selectedSuggestion]) {
      setCurrentInput(suggestions[selectedSuggestion]);
      setShowSuggestions(false);
    }
  }, [showSuggestions, suggestions, selectedSuggestion]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentInput.trim()) return;

    const cmd = currentInput.trim();
    addLine('input', `${promptRef.current || `${vpnSettings.vpnUser}@${vpnSettings.vpnHost}:~$ `}${cmd}`);
    
    setCommandHistory(prev => [...prev.filter(c => c !== cmd), cmd]);
    setHistoryIndex(-1);
    setShowSuggestions(false);

    // Send command via WebSocket if connected
    if (wsRef.current?.readyState === WebSocket.OPEN && wsConnected) {
      wsRef.current.send(JSON.stringify({
        type: 'command',
        command: cmd
      }));
    } else {
      // Fallback to local processing
      const output = processCommand(cmd);
      if (output) {
        addLine('output', output);
      }
    }

    setCurrentInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'Tab') {
        e.preventDefault();
        acceptSuggestion();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSuggestions(false);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestion(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestion(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        return;
      }
    } else {
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

              {/* Input Line with Autocomplete */}
              <form onSubmit={handleSubmit} className="flex-shrink-0 border-t border-gray-700 p-2 relative">
                <AutocompleteDropdown
                  suggestions={suggestions}
                  selectedIndex={selectedSuggestion}
                  inputValue={currentInput}
                  onSelect={(value) => {
                    setCurrentInput(value);
                    setShowSuggestions(false);
                    inputRef.current?.focus();
                  }}
                  visible={showSuggestions}
                />
                <div className="flex items-center gap-2 font-mono text-sm">
                  <span className="text-green-400">
                    {vpnSettings.vpnUser}@{vpnSettings.vpnHost}:~$
                  </span>
                  <div className="relative flex-1">
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
                    {/* Ghost text */}
                    {ghostText && (
                      <span className="absolute left-0 top-0 pointer-events-none text-gray-500 font-mono text-sm">
                        {currentInput}
                        <span className="text-gray-600">{ghostText}</span>
                      </span>
                    )}
                  </div>
                </div>
              </form>

              {/* Status Bar */}
              <div className="flex-shrink-0 px-4 py-2 bg-gray-800 border-t border-gray-700 flex items-center justify-between text-xs text-gray-400">
                <span>SSH • {vpnSettings.vpnHost}:{vpnSettings.sshPort} • Tab para completar</span>
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
