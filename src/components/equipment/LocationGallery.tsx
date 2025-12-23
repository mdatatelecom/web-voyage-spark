import { useState, useMemo, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Search, ImageIcon, ChevronLeft, ChevronRight, ExternalLink, Camera } from 'lucide-react';

interface Port {
  id: string;
  name: string;
  port_number: number | null;
  status: string;
  notes: string | null;
}

interface LocationGalleryProps {
  ports: Port[];
  onPortClick?: (portId: string) => void;
}

interface PortNotesData {
  location_image_url?: string;
  locationPhotoUrl?: string;
  location_photo_url?: string;
  locationImageUrl?: string;
  location_description?: string;
  locationDescription?: string;
  [key: string]: any;
}

const parseNotes = (notes: string | null): PortNotesData => {
  if (!notes) return {};
  try {
    return typeof notes === 'string' ? JSON.parse(notes) : notes;
  } catch {
    return {};
  }
};

const extractImageUrl = (notes: PortNotesData): string | undefined => {
  return notes.location_image_url || 
         notes.locationPhotoUrl || 
         notes.location_photo_url ||
         notes.locationImageUrl ||
         undefined;
};

const extractDescription = (notes: PortNotesData): string | undefined => {
  return notes.location_description || notes.locationDescription || undefined;
};

const getStatusConfig = (status: string) => {
  const configs: Record<string, { label: string; color: string }> = {
    available: { label: 'Disponível', color: 'bg-green-500' },
    in_use: { label: 'Em Uso', color: 'bg-red-500' },
    reserved: { label: 'Reservado', color: 'bg-yellow-500' },
    disabled: { label: 'Desabilitado', color: 'bg-gray-500' },
    faulty: { label: 'Defeituoso', color: 'bg-gray-500' }
  };
  return configs[status] || { label: status, color: 'bg-gray-500' };
};

export const LocationGallery = ({ ports, onPortClick }: LocationGalleryProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  // Filter ports that have location images
  const portsWithImages = useMemo(() => {
    return ports
      .map(port => {
        const notesData = parseNotes(port.notes);
        const imageUrl = extractImageUrl(notesData);
        const description = extractDescription(notesData);
        return { ...port, imageUrl, description };
      })
      .filter(port => port.imageUrl);
  }, [ports]);

  // Apply filters
  const filteredPorts = useMemo(() => {
    return portsWithImages.filter(port => {
      const matchesSearch = port.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (port.description?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || port.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [portsWithImages, searchTerm, statusFilter]);

  const selectedPort = selectedIndex !== null ? filteredPorts[selectedIndex] : null;

  const handlePrevious = useCallback(() => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  }, [selectedIndex]);

  const handleNext = useCallback(() => {
    if (selectedIndex !== null && selectedIndex < filteredPorts.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  }, [selectedIndex, filteredPorts.length]);

  const handleClose = useCallback(() => {
    setSelectedIndex(null);
  }, []);

  // Keyboard navigation for fullscreen preview
  useEffect(() => {
    if (selectedIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, handlePrevious, handleNext, handleClose]);

  const handleImageError = (portId: string) => {
    setImageErrors(prev => new Set(prev).add(portId));
  };

  const portsWithoutImages = ports.length - portsWithImages.length;

  if (portsWithImages.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Camera className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Galeria de Localizações</h2>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Nenhuma porta possui foto de localização.</p>
          <p className="text-sm mt-1">Edite as portas para adicionar fotos.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Galeria de Localizações</h2>
          <Badge variant="secondary">{portsWithImages.length} fotos</Badge>
        </div>
        <span className="text-sm text-muted-foreground">
          {portsWithoutImages} porta{portsWithoutImages !== 1 ? 's' : ''} sem foto
        </span>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="available">Disponível</SelectItem>
            <SelectItem value="in_use">Em Uso</SelectItem>
            <SelectItem value="reserved">Reservado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredPorts.map((port, index) => {
          const statusConfig = getStatusConfig(port.status);
          const hasError = imageErrors.has(port.id);
          
          return (
            <div
              key={port.id}
              className="relative group cursor-pointer rounded-lg overflow-hidden border bg-muted/30 aspect-video"
              onClick={() => setSelectedIndex(index)}
            >
              {hasError ? (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                </div>
              ) : (
                <img
                  src={port.imageUrl}
                  alt={`Localização ${port.name}`}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  onError={() => handleImageError(port.id)}
                />
              )}
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-100 group-hover:opacity-100 transition-opacity" />
              
              {/* Port info */}
              <div className="absolute bottom-0 left-0 right-0 p-2">
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm font-medium truncate">{port.name}</span>
                  <Badge className={`${statusConfig.color} text-xs`}>
                    {statusConfig.label}
                  </Badge>
                </div>
                {port.description && (
                  <p className="text-white/80 text-xs truncate mt-0.5">{port.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredPorts.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>Nenhuma porta encontrada com os filtros aplicados.</p>
        </div>
      )}

      {/* Fullscreen Preview Modal */}
      <Dialog open={selectedIndex !== null} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="w-screen h-screen max-w-none max-h-none p-0 bg-black border-none rounded-none [&>button]:hidden">
          {/* Header overlay */}
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Camera className="w-5 h-5 text-white" />
                <span className="text-white font-medium">{selectedPort?.name}</span>
                {selectedPort && (
                  <Badge className={`${getStatusConfig(selectedPort.status).color} text-white`}>
                    {getStatusConfig(selectedPort.status).label}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/80 text-sm">
                  {selectedIndex !== null ? selectedIndex + 1 : 0} / {filteredPorts.length}
                </span>
                {selectedPort?.imageUrl && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={() => window.open(selectedPort.imageUrl, '_blank')}
                  >
                    <ExternalLink className="w-5 h-5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={handleClose}
                >
                  <span className="sr-only">Fechar</span>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
            </div>
          </div>

          {/* Image container */}
          <div className="w-full h-full flex items-center justify-center">
            {selectedPort && (
              <img
                src={selectedPort.imageUrl}
                alt={`Localização ${selectedPort.name}`}
                className="max-w-full max-h-full object-contain select-none"
                draggable={false}
              />
            )}
          </div>

          {/* Navigation buttons */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 text-white disabled:opacity-30"
            onClick={handlePrevious}
            disabled={selectedIndex === 0}
          >
            <ChevronLeft className="w-8 h-8" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 text-white disabled:opacity-30"
            onClick={handleNext}
            disabled={selectedIndex === filteredPorts.length - 1}
          >
            <ChevronRight className="w-8 h-8" />
          </Button>

          {/* Footer overlay with description */}
          {selectedPort?.description && (
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10">
              <p className="text-white/90 text-sm text-center max-w-2xl mx-auto">
                {selectedPort.description}
              </p>
            </div>
          )}

          {/* Keyboard hints */}
          <div className="absolute bottom-4 right-4 z-10 hidden md:flex items-center gap-2 text-white/50 text-xs">
            <kbd className="px-2 py-1 bg-white/10 rounded">←</kbd>
            <kbd className="px-2 py-1 bg-white/10 rounded">→</kbd>
            <span>navegar</span>
            <kbd className="px-2 py-1 bg-white/10 rounded ml-2">ESC</kbd>
            <span>fechar</span>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
