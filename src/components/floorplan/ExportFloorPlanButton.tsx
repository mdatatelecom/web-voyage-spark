import { useState, useRef } from 'react';
import { Download, FileImage, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';

interface ExportFloorPlanButtonProps {
  stageRef: React.RefObject<any>;
  floorName: string;
  buildingName?: string;
}

export function ExportFloorPlanButton({
  stageRef,
  floorName,
  buildingName,
}: ExportFloorPlanButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const getFileName = (extension: string) => {
    const date = new Date().toISOString().split('T')[0];
    const safeName = floorName.replace(/[^a-zA-Z0-9]/g, '_');
    return `planta_${safeName}_${date}.${extension}`;
  };

  const exportAsImage = async (format: 'png' | 'jpg') => {
    if (!stageRef.current) {
      toast.error('Não foi possível exportar a planta');
      return;
    }

    setIsExporting(true);
    try {
      const stage = stageRef.current;
      const pixelRatio = 2; // Higher quality
      
      const dataUrl = stage.toDataURL({
        pixelRatio,
        mimeType: format === 'png' ? 'image/png' : 'image/jpeg',
        quality: 0.95,
      });

      // Create download link
      const link = document.createElement('a');
      link.download = getFileName(format);
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Planta exportada como ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erro ao exportar planta');
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsPDF = async () => {
    if (!stageRef.current) {
      toast.error('Não foi possível exportar a planta');
      return;
    }

    setIsExporting(true);
    try {
      const stage = stageRef.current;
      const pixelRatio = 2;
      
      const dataUrl = stage.toDataURL({
        pixelRatio,
        mimeType: 'image/jpeg',
        quality: 0.95,
      });

      // Get stage dimensions
      const stageWidth = stage.width();
      const stageHeight = stage.height();

      // Calculate PDF dimensions (A4 landscape or portrait based on aspect ratio)
      const aspectRatio = stageWidth / stageHeight;
      const isLandscape = aspectRatio > 1;
      
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Add title
      pdf.setFontSize(16);
      pdf.text(`Planta Baixa: ${floorName}`, 10, 15);
      
      if (buildingName) {
        pdf.setFontSize(12);
        pdf.text(buildingName, 10, 22);
      }

      // Add date
      pdf.setFontSize(10);
      pdf.setTextColor(128);
      const date = new Date().toLocaleDateString('pt-BR');
      pdf.text(`Exportado em: ${date}`, 10, isLandscape ? 28 : 30);

      // Calculate image dimensions to fit page
      const margin = 10;
      const headerSpace = 35;
      const availableWidth = pageWidth - margin * 2;
      const availableHeight = pageHeight - headerSpace - margin;

      let imgWidth = availableWidth;
      let imgHeight = imgWidth / aspectRatio;

      if (imgHeight > availableHeight) {
        imgHeight = availableHeight;
        imgWidth = imgHeight * aspectRatio;
      }

      // Center image horizontally
      const imgX = (pageWidth - imgWidth) / 2;

      // Add image
      pdf.addImage(dataUrl, 'JPEG', imgX, headerSpace, imgWidth, imgHeight);

      // Save PDF
      pdf.save(getFileName('pdf'));

      toast.success('Planta exportada como PDF');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Erro ao exportar PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => exportAsImage('png')}>
          <FileImage className="mr-2 h-4 w-4" />
          Exportar PNG
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportAsImage('jpg')}>
          <FileImage className="mr-2 h-4 w-4" />
          Exportar JPG
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAsPDF}>
          <FileText className="mr-2 h-4 w-4" />
          Exportar PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
