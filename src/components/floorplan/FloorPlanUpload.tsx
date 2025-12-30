import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileImage, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useFloorPlans } from '@/hooks/useFloorPlans';

interface FloorPlanUploadProps {
  floorId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ACCEPTED_TYPES = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/svg+xml': ['.svg'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
};

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function FloorPlanUpload({ floorId, open, onOpenChange }: FloorPlanUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  
  const { uploadFloorPlan, isUploading } = useFloorPlans(floorId);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      setFile(selectedFile);
      setName(selectedFile.name.replace(/\.[^/.]+$/, ''));
      
      // Create preview and get dimensions
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          setPreview(result);
          
          // Get image dimensions
          const img = new Image();
          img.onload = () => {
            setDimensions({ width: img.width, height: img.height });
          };
          img.src = result;
        };
        reader.readAsDataURL(selectedFile);
      } else if (selectedFile.type === 'application/pdf') {
        setPreview(null);
        setDimensions(null);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE,
    multiple: false,
  });

  const handleUpload = () => {
    if (file && name) {
      uploadFloorPlan({
        floorId,
        file,
        name,
        width: dimensions?.width,
        height: dimensions?.height,
      }, {
        onSuccess: () => {
          handleClose();
        }
      });
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setName('');
    setDimensions(null);
    onOpenChange(false);
  };

  const removeFile = () => {
    setFile(null);
    setPreview(null);
    setDimensions(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload de Planta Baixa</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {!file ? (
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors duration-200
                ${isDragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-primary/50'
                }
              `}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium">
                {isDragActive 
                  ? 'Solte o arquivo aqui...' 
                  : 'Arraste uma planta ou clique para selecionar'
                }
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                PNG, JPG, SVG, WebP ou PDF (máx. 10MB)
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative border rounded-lg p-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={removeFile}
                >
                  <X className="h-4 w-4" />
                </Button>
                
                {preview ? (
                  <img 
                    src={preview} 
                    alt="Preview" 
                    className="max-h-48 mx-auto object-contain rounded"
                  />
                ) : (
                  <div className="flex items-center justify-center h-32">
                    <FileImage className="w-16 h-16 text-muted-foreground" />
                  </div>
                )}
                
                <div className="mt-4 text-center">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                    {dimensions && ` • ${dimensions.width}x${dimensions.height}px`}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nome da Planta</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Planta Térreo - Versão 2024"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={!file || !name || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Enviar Planta
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
