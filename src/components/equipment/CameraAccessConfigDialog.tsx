import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Settings, Link2, Eye, EyeOff, Copy, Check, Info, Wifi } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CameraAccessConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cameraName: string;
  currentUrl?: string;
  onSave: (url: string, config: StreamConfig) => void;
}

export interface StreamConfig {
  protocol: string;
  username?: string;
  password?: string;
  host: string;
  port?: string;
  path: string;
}

interface ProtocolOption {
  value: string;
  label: string;
  defaultPort: string;
  category: 'supported' | 'proxy' | 'other';
  description: string;
}

const PROTOCOLS: ProtocolOption[] = [
  // Supported in browser
  { value: 'http', label: 'HTTP', defaultPort: '80', category: 'supported', description: 'Stream HTTP (HLS, MJPEG, Snapshot)' },
  { value: 'https', label: 'HTTPS', defaultPort: '443', category: 'supported', description: 'Stream HTTP seguro' },
  // Require proxy/conversion
  { value: 'rtsp', label: 'RTSP', defaultPort: '554', category: 'proxy', description: 'Real Time Streaming Protocol' },
  { value: 'rtmp', label: 'RTMP', defaultPort: '1935', category: 'proxy', description: 'Real Time Messaging Protocol' },
  { value: 'rtmps', label: 'RTMPS', defaultPort: '443', category: 'proxy', description: 'RTMP seguro' },
  { value: 'srt', label: 'SRT', defaultPort: '9000', category: 'proxy', description: 'Secure Reliable Transport' },
  { value: 'webrtc', label: 'WebRTC', defaultPort: '8554', category: 'proxy', description: 'WebRTC stream' },
  { value: 'wss', label: 'WSS', defaultPort: '443', category: 'proxy', description: 'WebSocket Secure' },
  // Other (informational)
  { value: 'udp', label: 'UDP', defaultPort: '5000', category: 'other', description: 'UDP Multicast' },
  { value: 'rtp', label: 'RTP', defaultPort: '5004', category: 'other', description: 'Real-time Transport Protocol' },
  { value: 'ndi', label: 'NDI', defaultPort: '', category: 'other', description: 'Network Device Interface' },
  { value: 'tcp', label: 'TCP', defaultPort: '7000', category: 'other', description: 'TCP direto' },
];

interface ManufacturerTemplate {
  id: string;
  name: string;
  logo: string;
  templates: {
    type: string;
    label: string;
    protocol: string;
    port: string;
    path: string;
    description: string;
  }[];
}

const MANUFACTURER_TEMPLATES: ManufacturerTemplate[] = [
  {
    id: 'hikvision',
    name: 'Hikvision',
    logo: '🔴',
    templates: [
      { type: 'rtsp_main', label: 'RTSP Principal', protocol: 'rtsp', port: '554', path: '/Streaming/Channels/101', description: 'Stream principal H.265' },
      { type: 'rtsp_sub', label: 'RTSP Sub-stream', protocol: 'rtsp', port: '554', path: '/Streaming/Channels/102', description: 'Sub-stream menor' },
      { type: 'snapshot', label: 'Snapshot HTTP', protocol: 'http', port: '80', path: '/Streaming/Channels/101/picture', description: 'Captura JPEG' },
      { type: 'mjpeg', label: 'MJPEG HTTP', protocol: 'http', port: '80', path: '/Streaming/Channels/101/httpPreview', description: 'Stream MJPEG' },
    ]
  },
  {
    id: 'dahua',
    name: 'Dahua',
    logo: '🔵',
    templates: [
      { type: 'rtsp_main', label: 'RTSP Principal', protocol: 'rtsp', port: '554', path: '/cam/realmonitor?channel=1&subtype=0', description: 'Stream principal' },
      { type: 'rtsp_sub', label: 'RTSP Sub-stream', protocol: 'rtsp', port: '554', path: '/cam/realmonitor?channel=1&subtype=1', description: 'Sub-stream' },
      { type: 'snapshot', label: 'Snapshot', protocol: 'http', port: '80', path: '/cgi-bin/snapshot.cgi?channel=1', description: 'Captura JPEG' },
      { type: 'mjpeg', label: 'MJPEG', protocol: 'http', port: '80', path: '/cgi-bin/mjpg/video.cgi?channel=1', description: 'Stream MJPEG' },
    ]
  },
  {
    id: 'intelbras',
    name: 'Intelbras',
    logo: '🟢',
    templates: [
      { type: 'rtsp_main', label: 'RTSP Principal', protocol: 'rtsp', port: '554', path: '/cam/realmonitor?channel=1&subtype=0', description: 'Stream principal' },
      { type: 'rtsp_sub', label: 'RTSP Sub-stream', protocol: 'rtsp', port: '554', path: '/cam/realmonitor?channel=1&subtype=1', description: 'Sub-stream' },
      { type: 'snapshot', label: 'Snapshot', protocol: 'http', port: '80', path: '/snap.cgi?chn=1', description: 'Captura JPEG' },
      { type: 'mjpeg', label: 'MJPEG', protocol: 'http', port: '80', path: '/video1.mjpg', description: 'Stream MJPEG' },
    ]
  },
  {
    id: 'axis',
    name: 'Axis',
    logo: '🟡',
    templates: [
      { type: 'rtsp_main', label: 'RTSP Principal', protocol: 'rtsp', port: '554', path: '/axis-media/media.amp', description: 'Stream RTSP' },
      { type: 'mjpeg', label: 'MJPEG', protocol: 'http', port: '80', path: '/axis-cgi/mjpg/video.cgi', description: 'Stream MJPEG' },
      { type: 'snapshot', label: 'Snapshot', protocol: 'http', port: '80', path: '/axis-cgi/jpg/image.cgi', description: 'Captura JPEG' },
      { type: 'hls', label: 'HLS', protocol: 'http', port: '80', path: '/axis-media/media.m3u8', description: 'Stream HLS' },
    ]
  },
  {
    id: 'foscam',
    name: 'Foscam',
    logo: '⚪',
    templates: [
      { type: 'rtsp_main', label: 'RTSP Principal', protocol: 'rtsp', port: '554', path: '/videoMain', description: 'Stream principal' },
      { type: 'rtsp_sub', label: 'RTSP Sub-stream', protocol: 'rtsp', port: '554', path: '/videoSub', description: 'Sub-stream' },
      { type: 'mjpeg', label: 'MJPEG', protocol: 'http', port: '80', path: '/videostream.cgi', description: 'Stream MJPEG' },
      { type: 'snapshot', label: 'Snapshot', protocol: 'http', port: '80', path: '/snapshot.cgi', description: 'Captura JPEG' },
    ]
  },
  {
    id: 'ubiquiti',
    name: 'Ubiquiti',
    logo: '🔷',
    templates: [
      { type: 'rtsp_main', label: 'RTSP Principal', protocol: 'rtsp', port: '554', path: '/s0', description: 'Stream principal' },
      { type: 'rtsp_sub', label: 'RTSP Sub-stream', protocol: 'rtsp', port: '554', path: '/s1', description: 'Sub-stream' },
      { type: 'snapshot', label: 'Snapshot', protocol: 'http', port: '80', path: '/snap.jpeg', description: 'Captura JPEG' },
    ]
  },
  {
    id: 'giga',
    name: 'Giga Security',
    logo: '🔷',
    templates: [
      { type: 'rtsp_main', label: 'RTSP Principal', protocol: 'rtsp', port: '554', path: '/cam/realmonitor?channel=1&subtype=0', description: 'Stream principal' },
      { type: 'rtsp_sub', label: 'RTSP Sub-stream', protocol: 'rtsp', port: '554', path: '/cam/realmonitor?channel=1&subtype=1', description: 'Sub-stream' },
      { type: 'snapshot', label: 'Snapshot', protocol: 'http', port: '80', path: '/cgi-bin/snapshot.cgi', description: 'Captura JPEG' },
    ]
  },
];

// Parse URL with authentication
const parseStreamUrl = (url: string): StreamConfig => {
  const defaultConfig: StreamConfig = {
    protocol: 'http',
    host: '',
    port: '',
    path: '',
  };

  if (!url) return defaultConfig;

  try {
    // Handle URLs with authentication (user:pass@host)
    const urlObj = new URL(url);
    
    return {
      protocol: urlObj.protocol.replace(':', ''),
      username: urlObj.username || undefined,
      password: urlObj.password || undefined,
      host: urlObj.hostname,
      port: urlObj.port || undefined,
      path: urlObj.pathname + urlObj.search,
    };
  } catch {
    // Try to parse manually for non-standard protocols
    const match = url.match(/^(\w+):\/\/(([^:]+):([^@]+)@)?([^:/]+)(?::(\d+))?(\/.*)?$/);
    if (match) {
      return {
        protocol: match[1],
        username: match[2] || undefined,
        password: match[3] || undefined,
        host: match[4],
        port: match[5] || undefined,
        path: match[6] || '/',
      };
    }
    return defaultConfig;
  }
};

// Build URL from config
const buildStreamUrl = (config: StreamConfig): string => {
  const { protocol, username, password, host, port, path } = config;
  
  if (!host) return '';
  
  let url = `${protocol}://`;
  
  if (username && password) {
    url += `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`;
  } else if (username) {
    url += `${encodeURIComponent(username)}@`;
  }
  
  url += host;
  
  if (port) {
    url += `:${port}`;
  }
  
  url += path.startsWith('/') ? path : `/${path}`;
  
  return url;
};

export function CameraAccessConfigDialog({ 
  open, 
  onOpenChange, 
  cameraName, 
  currentUrl,
  onSave 
}: CameraAccessConfigDialogProps) {
  const [config, setConfig] = useState<StreamConfig>({
    protocol: 'http',
    host: '',
    port: '',
    path: '/',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('manual');

  // Parse current URL on open
  useEffect(() => {
    if (open && currentUrl) {
      setConfig(parseStreamUrl(currentUrl));
    } else if (open) {
      setConfig({
        protocol: 'http',
        host: '',
        port: '',
        path: '/',
      });
    }
  }, [open, currentUrl]);

  // Update port when protocol changes
  const handleProtocolChange = (protocol: string) => {
    const protocolInfo = PROTOCOLS.find(p => p.value === protocol);
    setConfig(prev => ({
      ...prev,
      protocol,
      port: protocolInfo?.defaultPort || prev.port,
    }));
  };

  // Apply manufacturer template
  const applyTemplate = (manufacturerId: string, templateType: string) => {
    const manufacturer = MANUFACTURER_TEMPLATES.find(m => m.id === manufacturerId);
    const template = manufacturer?.templates.find(t => t.type === templateType);
    
    if (template) {
      setConfig(prev => ({
        ...prev,
        protocol: template.protocol,
        port: template.port,
        path: template.path,
      }));
      setActiveTab('manual');
    }
  };

  const builtUrl = useMemo(() => buildStreamUrl(config), [config]);

  const selectedProtocol = PROTOCOLS.find(p => p.value === config.protocol);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(builtUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    onSave(builtUrl, config);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configurar Acesso ao Vivo - {cameraName}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">
              <Link2 className="w-4 h-4 mr-2" />
              Configuração Manual
            </TabsTrigger>
            <TabsTrigger value="templates">
              <Wifi className="w-4 h-4 mr-2" />
              Templates de Fabricantes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4 mt-4">
            {/* Protocol Selection */}
            <div className="space-y-2">
              <Label>Protocolo</Label>
              <Select value={config.protocol} onValueChange={handleProtocolChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o protocolo" />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted">
                    ✅ Suportados no Navegador
                  </div>
                  {PROTOCOLS.filter(p => p.category === 'supported').map(p => (
                    <SelectItem key={p.value} value={p.value}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{p.label}://</span>
                        <span className="text-xs text-muted-foreground">- {p.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted mt-2">
                    ⚠️ Requerem Conversão/Proxy
                  </div>
                  {PROTOCOLS.filter(p => p.category === 'proxy').map(p => (
                    <SelectItem key={p.value} value={p.value}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{p.label}://</span>
                        <span className="text-xs text-muted-foreground">- {p.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted mt-2">
                    ❌ Outros (Não suportados)
                  </div>
                  {PROTOCOLS.filter(p => p.category === 'other').map(p => (
                    <SelectItem key={p.value} value={p.value}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{p.label}://</span>
                        <span className="text-xs text-muted-foreground">- {p.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedProtocol?.category !== 'supported' && (
                <div className="flex items-start gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded text-xs">
                  <Info className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-amber-600 dark:text-amber-400">
                      {selectedProtocol?.category === 'proxy' 
                        ? 'Este protocolo requer conversão para funcionar no navegador.'
                        : 'Este protocolo não é suportado diretamente no navegador.'}
                    </p>
                    <p className="text-muted-foreground mt-1">
                      Use <a href="https://github.com/AlexxIT/go2rtc" target="_blank" rel="noopener noreferrer" className="text-primary underline">go2rtc</a> ou similar para converter para HLS/MJPEG.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Authentication */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Usuário (opcional)</Label>
                <Input
                  value={config.username || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, username: e.target.value || undefined }))}
                  placeholder="admin"
                />
              </div>
              <div className="space-y-2">
                <Label>Senha (opcional)</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={config.password || ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, password: e.target.value || undefined }))}
                    placeholder="••••••••"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Host and Port */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Host / IP</Label>
                <Input
                  value={config.host}
                  onChange={(e) => setConfig(prev => ({ ...prev, host: e.target.value }))}
                  placeholder="192.168.1.100"
                />
              </div>
              <div className="space-y-2">
                <Label>Porta</Label>
                <Input
                  value={config.port || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, port: e.target.value || undefined }))}
                  placeholder={selectedProtocol?.defaultPort || '80'}
                />
              </div>
            </div>

            {/* Path */}
            <div className="space-y-2">
              <Label>Caminho do Stream</Label>
              <Input
                value={config.path}
                onChange={(e) => setConfig(prev => ({ ...prev, path: e.target.value }))}
                placeholder="/Streaming/Channels/101/picture"
              />
            </div>

            {/* URL Preview */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                URL Gerada
                <Badge variant="outline" className="text-xs">
                  {selectedProtocol?.category === 'supported' ? '✅ Suportada' : 
                   selectedProtocol?.category === 'proxy' ? '⚠️ Requer Proxy' : '❌ Não Suportada'}
                </Badge>
              </Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={builtUrl}
                  className="font-mono text-sm bg-muted"
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" onClick={handleCopyUrl}>
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{copied ? 'Copiado!' : 'Copiar URL'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="templates" className="mt-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Selecione o fabricante e o tipo de stream para preencher automaticamente a configuração.
                Você precisará informar apenas o IP e as credenciais.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                {MANUFACTURER_TEMPLATES.map(manufacturer => (
                  <Card key={manufacturer.id} className="p-4 space-y-3">
                    <div className="flex items-center gap-2 font-semibold">
                      <span className="text-xl">{manufacturer.logo}</span>
                      {manufacturer.name}
                    </div>
                    <div className="space-y-2">
                      {manufacturer.templates.map(template => (
                        <Button
                          key={template.type}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-left h-auto py-2"
                          onClick={() => applyTemplate(manufacturer.id, template.type)}
                        >
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{template.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {template.protocol}://...{template.path.slice(0, 30)}
                            </span>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!config.host}>
            Salvar Configuração
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
