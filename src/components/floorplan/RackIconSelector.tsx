import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export const RACK_STYLES = [
  { id: 'default', name: 'Padrão', description: 'Rack 19" com módulos' },
  { id: 'simple', name: 'Simples', description: 'Retângulo básico' },
  { id: 'server', name: 'Servidor', description: 'Rack com servidores' },
  { id: 'network', name: 'Network', description: 'Rack de switches' },
  { id: 'storage', name: 'Storage', description: 'Rack de armazenamento' },
  { id: 'cabinet', name: 'Gabinete', description: 'Gabinete fechado' },
] as const;

export type RackStyleId = typeof RACK_STYLES[number]['id'];

interface RackIconSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStyle?: string;
  onSelect: (style: string) => void;
}

// Mini preview components for each style
const StylePreview = ({ style }: { style: string }) => {
  const baseClass = "w-12 h-16 rounded border-2 flex flex-col items-center justify-center";
  
  switch (style) {
    case 'simple':
      return (
        <div className={cn(baseClass, "border-muted-foreground bg-muted")}>
          <div className="text-[8px] font-bold text-muted-foreground">RACK</div>
        </div>
      );
    case 'server':
      return (
        <div className={cn(baseClass, "border-blue-500 bg-blue-500/20")}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="w-8 h-2 bg-blue-500 rounded-sm mb-0.5" />
          ))}
        </div>
      );
    case 'network':
      return (
        <div className={cn(baseClass, "border-green-500 bg-green-500/20")}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="w-8 h-2 bg-green-500 rounded-sm mb-0.5 flex items-center justify-around">
              <div className="w-0.5 h-0.5 bg-green-300 rounded-full" />
              <div className="w-0.5 h-0.5 bg-green-300 rounded-full" />
              <div className="w-0.5 h-0.5 bg-green-300 rounded-full" />
            </div>
          ))}
        </div>
      );
    case 'storage':
      return (
        <div className={cn(baseClass, "border-purple-500 bg-purple-500/20")}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-8 h-3 bg-purple-500 rounded-sm mb-0.5 flex items-center px-0.5 gap-0.5">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="w-1 h-2 bg-purple-300 rounded-sm" />
              ))}
            </div>
          ))}
        </div>
      );
    case 'cabinet':
      return (
        <div className={cn(baseClass, "border-slate-600 bg-slate-600/30")}>
          <div className="w-10 h-12 border-2 border-slate-500 rounded-sm flex items-center justify-center">
            <div className="w-0.5 h-4 bg-slate-400" />
          </div>
        </div>
      );
    default:
      return (
        <div className="w-12 h-12 rounded-full border-2 border-blue-500 bg-white flex items-center justify-center">
          <div className="w-6 h-8 flex flex-col justify-between items-center">
            <div className="w-full flex justify-between">
              <div className="w-0.5 h-8 bg-blue-500 rounded-sm" />
              <div className="flex flex-col justify-around h-8 flex-1 px-0.5">
                <div className="w-full h-0.5 bg-blue-500 rounded-sm" />
                <div className="w-full h-0.5 bg-blue-500 rounded-sm" />
                <div className="w-full h-0.5 bg-blue-500 rounded-sm" />
                <div className="w-full h-0.5 bg-blue-500 rounded-sm" />
                <div className="w-full h-0.5 bg-blue-500 rounded-sm" />
              </div>
              <div className="w-0.5 h-8 bg-blue-500 rounded-sm" />
            </div>
          </div>
        </div>
      );
  }
};

export function RackIconSelector({ open, onOpenChange, currentStyle, onSelect }: RackIconSelectorProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Selecionar Estilo do Rack</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-3 py-4">
          {RACK_STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => onSelect(style.id)}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all hover:bg-accent",
                currentStyle === style.id
                  ? "border-primary bg-primary/10"
                  : "border-border"
              )}
            >
              <StylePreview style={style.id} />
              <div className="text-center">
                <div className="text-sm font-medium flex items-center gap-1">
                  {style.name}
                  {currentStyle === style.id && (
                    <Check className="h-3 w-3 text-primary" />
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground">{style.description}</div>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
