import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileImage, X, Loader2, ExternalLink, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFloorPlans } from '@/hooks/useFloorPlans';
import { convertPdfPageToImage, isPdfFile, getPdfPagePreviews, PdfPageInfo } from '@/lib/pdf-utils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  const [convertedFile, setConvertedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [isLoadingPreviews, setIsLoadingPreviews] = useState(false);
  const [pdfInfo, setPdfInfo] = useState<PdfPageInfo | null>(null);
  const [selectedPage, setSelectedPage] = useState(1);
  
  const { uploadFloorPlan, isUploading } = useFloorPlans(floorId);

  const processImageFile = (selectedFile: File) => {
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
  };

  const processPdfFile = async (selectedFile: File) => {
    setIsLoadingPreviews(true);
    try {
      const info = await getPdfPagePreviews(selectedFile, 20);
      setPdfInfo(info);
      setSelectedPage(1);
      
      if (info.pageCount === 1) {
        // Single page - convert immediately
        await convertSelectedPage(selectedFile, 1);
      } else {
        // Multi-page - show selector
        setIsLoadingPreviews(false);
      }
    } catch (error) {
      console.error('Error loading PDF:', error);
      toast.error('Erro ao carregar PDF. Tente outro arquivo.');
      setFile(null);
      setIsLoadingPreviews(false);
    }
  };

  const convertSelectedPage = async (pdfFile: File, pageNumber: number) => {
    setIsConverting(true);
    try {
      const result = await convertPdfPageToImage(pdfFile, pageNumber, 2);
      
      const pngFile = new File(
        [result.blob], 
        pdfFile.name.replace(/\.pdf$/i, `_p${pageNumber}.png`),
        { type: 'image/png' }
      );
      
      setConvertedFile(pngFile);
      setDimensions({ width: result.width, height: result.height });
      
      if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
      const previewUrl = URL.createObjectURL(result.blob);
      setPreview(previewUrl);
      
      toast.success(`Página ${pageNumber} convertida com sucesso!`);
    } catch (error) {
      console.error('Error converting PDF page:', error);
      toast.error('Erro ao converter página. Tente novamente.');
    } finally {
      setIsConverting(false);
      setIsLoadingPreviews(false);
    }
  };

  const handlePageSelect = (pageNumber: number) => {
    setSelectedPage(pageNumber);
    if (file) {
      convertSelectedPage(file, pageNumber);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      setFile(selectedFile);
      setConvertedFile(null);
      setPdfInfo(null);
      setSelectedPage(1);
      setName(selectedFile.name.replace(/\.[^/.]+$/, ''));
      
      if (isPdfFile(selectedFile)) {
        processPdfFile(selectedFile);
      } else if (selectedFile.type.startsWith('image/')) {
        processImageFile(selectedFile);
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
    const fileToUpload = convertedFile || file;
    if (fileToUpload && name) {
      uploadFloorPlan({
        floorId,
        file: fileToUpload,
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
    if (preview && preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }
    setFile(null);
    setConvertedFile(null);
    setPreview(null);
    setName('');
    setDimensions(null);
    setIsConverting(false);
    setIsLoadingPreviews(false);
    setPdfInfo(null);
    setSelectedPage(1);
    onOpenChange(false);
  };

  const removeFile = () => {
    if (preview && preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }
    setFile(null);
    setConvertedFile(null);
    setPreview(null);
    setDimensions(null);
    setPdfInfo(null);
    setSelectedPage(1);
  };

  const showPageSelector = pdfInfo && pdfInfo.pageCount > 1 && !convertedFile && !isConverting;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn("sm:max-w-lg", showPageSelector && "sm:max-w-2xl")}>
        <DialogHeader>
          <DialogTitle>Upload de Planta Baixa</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {!file ? (
            <>
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

              {/* DWG/DWF Info Alert */}
              <Alert variant="default" className="bg-muted/50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Arquivos DWG/DWF:</strong> Converta para PDF ou PNG usando seu software CAD (AutoCAD, LibreCAD) ou um{' '}
                  <a 
                    href="https://cloudconvert.com/dwg-to-png" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-0.5"
                  >
                    conversor online
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </AlertDescription>
              </Alert>
            </>
          ) : showPageSelector ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  Selecione a página ({pdfInfo.pageCount} páginas encontradas)
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeFile}
                >
                  <X className="h-4 w-4 mr-1" />
                  Remover
                </Button>
              </div>
              
              <ScrollArea className="h-[300px] rounded-md border p-4">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {pdfInfo.previews.map((previewUrl, index) => (
                    <button
                      key={index}
                      onClick={() => handlePageSelect(index + 1)}
                      className={cn(
                        "relative aspect-[3/4] rounded-lg border-2 overflow-hidden transition-all hover:ring-2 hover:ring-primary/50",
                        selectedPage === index + 1 
                          ? "border-primary ring-2 ring-primary/30" 
                          : "border-muted hover:border-primary/50"
                      )}
                    >
                      <img 
                        src={previewUrl} 
                        alt={`Página ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-background/80 py-1 text-center text-xs font-medium">
                        {index + 1}
                      </div>
                    </button>
                  ))}
                  {pdfInfo.pageCount > pdfInfo.previews.length && (
                    <div className="aspect-[3/4] rounded-lg border-2 border-dashed border-muted flex items-center justify-center">
                      <span className="text-xs text-muted-foreground text-center px-2">
                        +{pdfInfo.pageCount - pdfInfo.previews.length} páginas
                      </span>
                    </div>
                  )}
                </div>
              </ScrollArea>

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
          ) : (
            <div className="space-y-4">
              <div className="relative border rounded-lg p-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={removeFile}
                  disabled={isConverting || isLoadingPreviews}
                >
                  <X className="h-4 w-4" />
                </Button>
                
                {isConverting || isLoadingPreviews ? (
                  <div className="flex flex-col items-center justify-center h-32 gap-3">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">
                      {isLoadingPreviews ? 'Carregando páginas...' : 'Convertendo PDF para imagem...'}
                    </p>
                  </div>
                ) : preview ? (
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
                    {convertedFile && pdfInfo && pdfInfo.pageCount > 1 && ` • Página ${selectedPage} de ${pdfInfo.pageCount}`}
                    {convertedFile && ' • Convertido para PNG'}
                  </p>
                </div>

                {/* Page navigation for multi-page PDFs */}
                {convertedFile && pdfInfo && pdfInfo.pageCount > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={selectedPage <= 1 || isConverting}
                      onClick={() => handlePageSelect(selectedPage - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Página {selectedPage} de {pdfInfo.pageCount}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={selectedPage >= pdfInfo.pageCount || isConverting}
                      onClick={() => handlePageSelect(selectedPage + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
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
            disabled={!file || !name || isUploading || isConverting || isLoadingPreviews || showPageSelector}
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
