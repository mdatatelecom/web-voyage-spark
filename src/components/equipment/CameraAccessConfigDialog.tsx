import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useGo2rtcSettings } from '@/hooks/useGo2rtcSettings';
import {
  Eye,
  EyeOff,
  Copy,
  Check,
  Video,
  AlertTriangle,
  CheckCircle,
  Wifi,
  Loader2,
  XCircle,
} from 'lucide-react';

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
  supported: boolean;
  description: string;
}

interface ManufacturerTemplate {
  name: string;
  streams: {
    name: string;
    protocol: string;
    port: string;
    path: string;
    description: string;
  }[];
}

const PROTOCOLS: ProtocolOption[] = [
  { value: 'rtsp', label: 'RTSP', defaultPort: '554', supported: false, description: 'Requer go2rtc para conversão' },
  { value: 'rtmp', label: 'RTMP', defaultPort: '1935', supported: false, description: 'Requer servidor de mídia' },
  { value: 'rtmps', label: 'RTMPS', defaultPort: '443', supported: false, description: 'RTMP seguro' },
  { value: 'http', label: 'HTTP', defaultPort: '80', supported: true, description: 'HLS, MJPEG, Snapshot' },
  { value: 'https', label: 'HTTPS', defaultPort: '443', supported: true, description: 'HTTP seguro' },
  { value: 'srt', label: 'SRT', defaultPort: '9000', supported: false, description: 'Secure Reliable Transport' },
  { value: 'udp', label: 'UDP', defaultPort: '5000', supported: false, description: 'Multicast/Unicast' },
  { value: 'rtp', label: 'RTP', defaultPort: '5004', supported: false, description: 'Real-time Transport' },
  { value: 'webrtc', label: 'WebRTC', defaultPort: '443', supported: false, description: 'Depende do servidor' },
  { value: 'wss', label: 'WSS', defaultPort: '443', supported: false, description: 'WebSocket Secure' },
  { value: 'ndi', label: 'NDI', defaultPort: '', supported: false, description: 'Network Device Interface' },
  { value: 'tcp', label: 'TCP', defaultPort: '7000', supported: false, description: 'Stream direto TCP' },
];

const MANUFACTURER_TEMPLATES: ManufacturerTemplate[] = [
  {
    name: 'Hikvision',
    streams: [
      { name: 'Stream Principal', protocol: 'rtsp', port: '554', path: '/Streaming/Channels/101', description: 'Full HD' },
      { name: 'Sub-Stream', protocol: 'rtsp', port: '554', path: '/Streaming/Channels/102', description: 'Menor qualidade' },
      { name: 'Snapshot JPEG', protocol: 'http', port: '80', path: '/Streaming/Channels/101/picture', description: 'Imagem estática' },
      { name: 'MJPEG', protocol: 'http', port: '80', path: '/Streaming/Channels/101/httpPreview', description: 'Stream MJPEG' },
    ],
  },
  {
    name: 'Dahua / Intelbras',
    streams: [
      { name: 'Stream Principal', protocol: 'rtsp', port: '554', path: '/cam/realmonitor?channel=1&subtype=0', description: 'Full HD' },
      { name: 'Sub-Stream', protocol: 'rtsp', port: '554', path: '/cam/realmonitor?channel=1&subtype=1', description: 'Menor qualidade' },
      { name: 'Snapshot JPEG', protocol: 'http', port: '80', path: '/cgi-bin/snapshot.cgi', description: 'Imagem estática' },
      { name: 'MJPEG', protocol: 'http', port: '80', path: '/cgi-bin/mjpg/video.cgi', description: 'Stream MJPEG' },
    ],
  },
  {
    name: 'Axis',
    streams: [
      { name: 'Stream Principal', protocol: 'rtsp', port: '554', path: '/axis-media/media.amp', description: 'H.264' },
      { name: 'MJPEG', protocol: 'http', port: '80', path: '/axis-cgi/mjpg/video.cgi', description: 'Stream MJPEG' },
      { name: 'Snapshot', protocol: 'http', port: '80', path: '/axis-cgi/jpg/image.cgi', description: 'Imagem estática' },
    ],
  },
  {
    name: 'Foscam',
    streams: [
      { name: 'Stream Principal', protocol: 'rtsp', port: '554', path: '/videoMain', description: 'Full HD' },
      { name: 'Sub-Stream', protocol: 'rtsp', port: '554', path: '/videoSub', description: 'Menor qualidade' },
      { name: 'Snapshot', protocol: 'http', port: '80', path: '/cgi-bin/CGIProxy.fcgi?cmd=snapPicture2', description: 'Imagem estática' },
    ],
  },
  {
    name: 'Ubiquiti',
    streams: [
      { name: 'Stream Principal', protocol: 'rtsp', port: '554', path: '/s0', description: 'Alta qualidade' },
      { name: 'Sub-Stream', protocol: 'rtsp', port: '554', path: '/s1', description: 'Menor qualidade' },
      { name: 'Third Stream', protocol: 'rtsp', port: '554', path: '/s2', description: 'Qualidade mínima' },
    ],
  },
  {
    name: 'Giga Security',
    streams: [
      { name: 'Stream Principal', protocol: 'rtsp', port: '554', path: '/live.sdp', description: 'Full HD' },
      { name: 'Sub-Stream', protocol: 'rtsp', port: '554', path: '/h264.sdp', description: 'H.264' },
      { name: 'ONVIF', protocol: 'rtsp', port: '554', path: '/onvif1', description: 'ONVIF Profile S' },
    ],
  },
  {
    name: 'Genérico ONVIF',
    streams: [
      { name: 'ONVIF Profile S', protocol: 'rtsp', port: '554', path: '/onvif1', description: 'Padrão ONVIF' },
      { name: 'Stream Principal', protocol: 'rtsp', port: '554', path: '/live.sdp', description: 'Alternativo' },
      { name: 'H.264', protocol: 'rtsp', port: '554', path: '/h264', description: 'Stream H.264' },
    ],
  },
];

function parseStreamUrl(url: string): StreamConfig {
  try {
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
    return {
      protocol: 'rtsp',
      host: '',
      path: '',
    };
  }
}

function buildStreamUrl(config: StreamConfig): string {
  let url = `${config.protocol}://`;
  
  if (config.username) {
    url += encodeURIComponent(config.username);
    if (config.password) {
      url += `:${encodeURIComponent(config.password)}`;
    }
    url += '@';
  }
  
  url += config.host;
  
  if (config.port) {
    url += `:${config.port}`;
  }
  
  if (config.path) {
    if (!config.path.startsWith('/')) {
      url += '/';
    }
    url += config.path;
  }
  
  return url;
}

export function CameraAccessConfigDialog({
  open,
  onOpenChange,
  cameraName,
  currentUrl,
  onSave,
}: CameraAccessConfigDialogProps) {
  const { toast } = useToast();
  const { settings: go2rtcSettings, registerStream, getSnapshot, deleteStream } = useGo2rtcSettings();
  
  const [config, setConfig] = useState<StreamConfig>({
    protocol: 'rtsp',
    host: '',
    port: '554',
    path: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState<string | null>(null);

  useEffect(() => {
    if (open && currentUrl) {
      setConfig(parseStreamUrl(currentUrl));
    } else if (open) {
      setConfig({
        protocol: 'rtsp',
        host: '',
        port: '554',
        path: '',
      });
    }
    setTestStatus('idle');
    setTestError(null);
  }, [open, currentUrl]);

  const handleProtocolChange = (protocol: string) => {
    const protocolInfo = PROTOCOLS.find(p => p.value === protocol);
    setConfig(prev => ({
      ...prev,
      protocol,
      port: protocolInfo?.defaultPort || prev.port,
    }));
  };

  const applyTemplate = (template: ManufacturerTemplate, streamIndex: number) => {
    const stream = template.streams[streamIndex];
    const protocolInfo = PROTOCOLS.find(p => p.value === stream.protocol);
    
    setConfig(prev => ({
      ...prev,
      protocol: stream.protocol,
      port: stream.port || protocolInfo?.defaultPort || '',
      path: stream.path,
    }));

    toast({
      title: 'Template aplicado',
      description: `${template.name} - ${stream.name}`,
    });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(buildStreamUrl(config));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const testConnection = async () => {
    setTestStatus('testing');
    setTestError(null);
    
    const url = buildStreamUrl(config);
    const isRtsp = config.protocol === 'rtsp';
    
    try {
      if (isRtsp) {
        if (!go2rtcSettings.enabled || !go2rtcSettings.serverUrl) {
          throw new Error('Configure o servidor go2rtc em Sistema → Streaming para testar URLs RTSP');
        }
        
        const streamName = `test-${Date.now()}`;
        const registerResult = await registerStream(streamName, url);
        
        if (!registerResult.success) {
          throw new Error(registerResult.message || 'Falha ao registrar stream');
        }
        
        const snapshot = await getSnapshot(streamName);
        await deleteStream(streamName);
        
        if (snapshot) {
          URL.revokeObjectURL(snapshot);
          setTestStatus('success');
        } else {
          throw new Error('Não foi possível obter frame da câmera. Verifique credenciais e caminho.');
        }
      } else {
        await fetch(url, { 
          method: 'HEAD',
          mode: 'no-cors',
          signal: AbortSignal.timeout(10000),
        });
        setTestStatus('success');
      }
    } catch (error) {
      setTestStatus('error');
      setTestError(error instanceof Error ? error.message : 'Erro ao testar conexão');
    }
  };

  const handleSave = () => {
    const url = buildStreamUrl(config);
    onSave(url, config);
    onOpenChange(false);
  };

  const currentProtocol = PROTOCOLS.find(p => p.value === config.protocol);
  const previewUrl = buildStreamUrl(config);
  const maskedUrl = config.password 
    ? previewUrl.replace(`:${encodeURIComponent(config.password)}@`, ':****@')
    : previewUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Configurar Acesso ao Vivo
          </DialogTitle>
          <DialogDescription>
            Configure a URL de streaming para {cameraName}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="manual" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Protocolo</Label>
              <Select value={config.protocol} onValueChange={handleProtocolChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROTOCOLS.map(proto => (
                    <SelectItem key={proto.value} value={proto.value}>
                      <div className="flex items-center gap-2">
                        <span>{proto.label}://</span>
                        {proto.supported ? (
                          <Badge variant="secondary" className="text-xs">Suportado</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Proxy</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {currentProtocol && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {currentProtocol.supported ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 text-yellow-500" />
                  )}
                  {currentProtocol.description}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Usuário (opcional)</Label>
                <Input
                  value={config.username || ''}
                  onChange={e => setConfig(prev => ({ ...prev, username: e.target.value || undefined }))}
                  placeholder="admin"
                />
              </div>
              <div className="space-y-2">
                <Label>Senha (opcional)</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={config.password || ''}
                    onChange={e => setConfig(prev => ({ ...prev, password: e.target.value || undefined }))}
                    placeholder="••••••"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Host / IP</Label>
                <Input
                  value={config.host}
                  onChange={e => setConfig(prev => ({ ...prev, host: e.target.value }))}
                  placeholder="192.168.1.100"
                />
              </div>
              <div className="space-y-2">
                <Label>Porta</Label>
                <Input
                  value={config.port || ''}
                  onChange={e => setConfig(prev => ({ ...prev, port: e.target.value || undefined }))}
                  placeholder={currentProtocol?.defaultPort}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Caminho</Label>
              <Input
                value={config.path}
                onChange={e => setConfig(prev => ({ ...prev, path: e.target.value }))}
                placeholder="/Streaming/Channels/101"
              />
            </div>

            <div className="space-y-2">
              <Label>URL Completa</Label>
              <div className="flex gap-2">
                <code className="flex-1 p-2 bg-muted rounded text-sm break-all">
                  {maskedUrl}
                </code>
                <Button variant="outline" size="icon" onClick={copyToClipboard}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {testStatus !== 'idle' && (
              <div className={`p-3 rounded-lg flex items-center gap-2 ${
                testStatus === 'testing' ? 'bg-muted' :
                testStatus === 'success' ? 'bg-green-500/10 text-green-700' :
                'bg-destructive/10 text-destructive'
              }`}>
                {testStatus === 'testing' && <Loader2 className="h-4 w-4 animate-spin" />}
                {testStatus === 'success' && <CheckCircle className="h-4 w-4" />}
                {testStatus === 'error' && <XCircle className="h-4 w-4" />}
                <span className="text-sm">
                  {testStatus === 'testing' && 'Testando conexão...'}
                  {testStatus === 'success' && 'Conexão bem-sucedida!'}
                  {testStatus === 'error' && (testError || 'Falha na conexão')}
                </span>
              </div>
            )}
          </TabsContent>

          <TabsContent value="templates" className="mt-4">
            <div className="grid gap-4">
              {MANUFACTURER_TEMPLATES.map(template => (
                <Card key={template.name}>
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-3">{template.name}</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {template.streams.map((stream, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          className="justify-start h-auto py-2"
                          onClick={() => applyTemplate(template, idx)}
                        >
                          <div className="text-left">
                            <div className="flex items-center gap-1">
                              <span>{stream.name}</span>
                              <Badge variant="secondary" className="text-[10px]">
                                {stream.protocol.toUpperCase()}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">{stream.description}</span>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6 gap-2">
          <Button
            variant="outline"
            onClick={testConnection}
            disabled={!config.host || testStatus === 'testing'}
          >
            {testStatus === 'testing' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Wifi className="h-4 w-4 mr-2" />
            )}
            Testar Conexão
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!config.host}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CameraAccessConfigDialog;
