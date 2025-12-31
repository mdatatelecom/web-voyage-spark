import React from 'react';
import { Copy, Trash2, RotateCw, RotateCcw, ImageIcon, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RackContextMenuProps {
  x: number;
  y: number;
  rackName?: string;
  currentSize?: 'small' | 'medium' | 'large';
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onChangeIcon: () => void;
  onRotate: (degrees: number) => void;
  onChangeSize?: (size: 'small' | 'medium' | 'large') => void;
  onClose: () => void;
}

const SIZE_LABELS: Record<string, string> = {
  small: 'P',
  medium: 'M',
  large: 'G',
};

export const RackContextMenu: React.FC<RackContextMenuProps> = ({
  x,
  y,
  rackName,
  currentSize = 'medium',
  onEdit,
  onDuplicate,
  onDelete,
  onChangeIcon,
  onRotate,
  onChangeSize,
  onClose,
}) => {
  const handleItemClick = (action: () => void) => {
    action();
    onClose();
  };

  // Adjust position to stay within viewport
  const menuWidth = 200;
  const menuHeight = 340;
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 20);
  const adjustedY = Math.min(y, window.innerHeight - menuHeight - 20);

  return (
    <div
      className="fixed z-50 min-w-[180px] bg-popover border border-border rounded-lg shadow-xl overflow-hidden"
      style={{
        left: adjustedX,
        top: adjustedY,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header with rack name */}
      {rackName && (
        <div className="px-3 py-2 bg-muted/50 border-b border-border">
          <span className="text-xs font-medium text-muted-foreground truncate block">
            {rackName}
          </span>
        </div>
      )}

      <div className="py-1">
        {/* Edit */}
        <button
          className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent transition-colors"
          onClick={() => handleItemClick(onEdit)}
        >
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
          <span>Abrir Detalhes</span>
        </button>

        {/* Duplicate */}
        <button
          className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent transition-colors"
          onClick={() => handleItemClick(onDuplicate)}
        >
          <Copy className="h-4 w-4 text-muted-foreground" />
          <span>Duplicar</span>
        </button>

        {/* Change Icon */}
        <button
          className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent transition-colors"
          onClick={() => handleItemClick(onChangeIcon)}
        >
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
          <span>Alterar Ícone</span>
        </button>

        <div className="h-px bg-border my-1" />

        {/* Size selector */}
        {onChangeSize && (
          <>
            <div className="px-3 py-2">
              <span className="text-xs text-muted-foreground mb-1.5 block">Tamanho do Ícone</span>
              <div className="flex gap-1">
                {(['small', 'medium', 'large'] as const).map(size => (
                  <button
                    key={size}
                    className={cn(
                      "flex-1 px-2 py-1 text-xs rounded font-medium transition-colors",
                      currentSize === size 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                    )}
                    onClick={() => handleItemClick(() => onChangeSize(size))}
                  >
                    {SIZE_LABELS[size]}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-px bg-border my-1" />
          </>
        )}

        {/* Rotate clockwise */}
        <button
          className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent transition-colors"
          onClick={() => handleItemClick(() => onRotate(90))}
        >
          <RotateCw className="h-4 w-4 text-muted-foreground" />
          <span>Girar 90° (horário)</span>
          <span className="ml-auto text-xs text-muted-foreground">R</span>
        </button>

        {/* Rotate counter-clockwise */}
        <button
          className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent transition-colors"
          onClick={() => handleItemClick(() => onRotate(-90))}
        >
          <RotateCcw className="h-4 w-4 text-muted-foreground" />
          <span>Girar 90° (anti)</span>
          <span className="ml-auto text-xs text-muted-foreground">⇧R</span>
        </button>

        <div className="h-px bg-border my-1" />

        {/* Delete */}
        <button
          className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-destructive/10 text-destructive transition-colors"
          onClick={() => handleItemClick(onDelete)}
        >
          <Trash2 className="h-4 w-4" />
          <span>Excluir da Planta</span>
        </button>
      </div>
    </div>
  );
};
