import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, X, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardWidgetProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  isEditing?: boolean;
  onRemove?: () => void;
  className?: string;
  headerClassName?: string;
  noPadding?: boolean;
}

export const DashboardWidget: React.FC<DashboardWidgetProps> = ({
  title,
  icon,
  children,
  isEditing = false,
  onRemove,
  className,
  headerClassName,
  noPadding = false,
}) => {
  return (
    <Card 
      className={cn(
        "h-full flex flex-col overflow-hidden transition-all duration-200",
        "bg-card/80 backdrop-blur-sm border-border/50",
        "hover:shadow-lg hover:border-border",
        isEditing && "ring-2 ring-primary/20 cursor-move",
        className
      )}
    >
      <CardHeader 
        className={cn(
          "pb-2 flex-shrink-0",
          isEditing && "cursor-move",
          headerClassName
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isEditing && (
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
            )}
            {icon && (
              <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                {icon}
              </div>
            )}
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          </div>
          {isEditing && onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent 
        className={cn(
          "flex-1 overflow-auto",
          noPadding && "p-0"
        )}
      >
        {children}
      </CardContent>
    </Card>
  );
};
