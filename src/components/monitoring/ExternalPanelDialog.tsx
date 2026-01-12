import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, Maximize2, Minimize2, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExternalPanelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string | null;
  deviceName: string;
}

export function ExternalPanelDialog({
  open,
  onOpenChange,
  url,
  deviceName,
}: ExternalPanelDialogProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasError, setHasError] = useState(false);

  if (!url) return null;

  const handleOpenNewTab = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'transition-all duration-300',
          isFullscreen
            ? 'fixed inset-0 max-w-none w-screen h-screen rounded-none p-0'
            : 'max-w-6xl w-[90vw] h-[80vh]'
        )}
      >
        <DialogHeader
          className={cn(
            'flex flex-row items-center justify-between space-y-0 pb-2',
            isFullscreen && 'px-4 pt-4'
          )}
        >
          <DialogTitle className="flex items-center gap-2">
            <span className="truncate">Painel: {deviceName}</span>
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleOpenNewTab}
              title="Abrir em nova aba"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
            {isFullscreen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                title="Fechar"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <div
          className={cn(
            'relative flex-1 bg-muted rounded-md overflow-hidden',
            isFullscreen ? 'h-[calc(100vh-60px)]' : 'h-[calc(80vh-80px)]'
          )}
        >
          {hasError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-muted-foreground">
              <AlertCircle className="h-12 w-12" />
              <p className="text-center">
                Não foi possível carregar o painel.
                <br />
                <span className="text-sm">
                  Verifique se a URL está correta e acessível.
                </span>
              </p>
              <Button variant="outline" onClick={handleOpenNewTab}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir em nova aba
              </Button>
            </div>
          ) : (
            <iframe
              src={url}
              className="absolute inset-0 w-full h-full border-0"
              title={`Painel ${deviceName}`}
              onError={() => setHasError(true)}
              allow="fullscreen"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
