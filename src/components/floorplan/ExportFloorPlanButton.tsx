import { useState } from 'react';
import { Download, FileImage, FileText, Loader2, FileSpreadsheet, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import { EquipmentPosition } from '@/hooks/useEquipmentPositions';
import { RackPosition } from '@/hooks/useRackPositions';
import { EQUIPMENT_TYPE_LABELS, EQUIPMENT_TYPE_COLORS, ICON_OPTIONS } from './equipment-icons';

interface ExportFloorPlanButtonProps {
  stageRef: React.RefObject<any>;
  floorName: string;
  buildingName?: string;
  positions?: EquipmentPosition[];
  rackPositions?: RackPosition[];
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  planned: 'Planejado',
  offline: 'Offline',
  staged: 'Em teste',
  failed: 'Falha',
  decommissioning: 'Desativando',
};

export function ExportFloorPlanButton({
  stageRef,
  floorName,
  buildingName,
  positions = [],
  rackPositions = [],
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

  const exportFullPDF = async () => {
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

      const stageWidth = stage.width();
      const stageHeight = stage.height();
      const aspectRatio = stageWidth / stageHeight;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const date = new Date().toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // ====== PAGE 1: Cover + Floor Plan ======
      
      // Header background
      pdf.setFillColor(15, 23, 42); // slate-900
      pdf.rect(0, 0, pageWidth, 45, 'F');

      // Title
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Planta Baixa`, margin, 20);
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      pdf.text(floorName, margin, 30);
      
      if (buildingName) {
        pdf.setFontSize(11);
        pdf.setTextColor(200, 200, 200);
        pdf.text(buildingName, margin, 38);
      }

      // Stats box on right
      pdf.setFillColor(30, 41, 59); // slate-800
      pdf.roundedRect(pageWidth - margin - 50, 8, 50, 30, 2, 2, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text(String(positions.length), pageWidth - margin - 25, 25, { align: 'center' });
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Equipamentos', pageWidth - margin - 25, 32, { align: 'center' });

      // Date
      pdf.setTextColor(100, 100, 100);
      pdf.setFontSize(9);
      pdf.text(`Exportado em: ${date}`, margin, 55);

      // Floor plan image
      const imageTop = 60;
      const availableWidth = pageWidth - margin * 2;
      const availableHeight = 120;
      
      let imgWidth = availableWidth;
      let imgHeight = imgWidth / aspectRatio;

      if (imgHeight > availableHeight) {
        imgHeight = availableHeight;
        imgWidth = imgHeight * aspectRatio;
      }

      const imgX = (pageWidth - imgWidth) / 2;
      
      // Image border
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.5);
      pdf.rect(imgX - 1, imageTop - 1, imgWidth + 2, imgHeight + 2);
      pdf.addImage(dataUrl, 'JPEG', imgX, imageTop, imgWidth, imgHeight);

      // ====== PAGE 1 Continued: Legend ======
      const legendTop = imageTop + imgHeight + 15;
      
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Legenda de Ícones', margin, legendTop);

      // Get unique equipment types from positions
      const usedTypes = new Set(positions.map(p => (p as any).custom_icon || p.equipment?.type || 'other'));
      const legendItems = ICON_OPTIONS.filter(opt => 
        opt.value !== 'auto' && (usedTypes.has(opt.value) || opt.value === 'default')
      ).slice(0, 12); // Max 12 items

      const colWidth = (pageWidth - margin * 2) / 4;
      let currentX = margin;
      let currentY = legendTop + 8;

      legendItems.forEach((item, index) => {
        if (index > 0 && index % 4 === 0) {
          currentX = margin;
          currentY += 12;
        }

        // Color dot
        const color = item.color || '#6b7280';
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        pdf.setFillColor(r, g, b);
        pdf.circle(currentX + 3, currentY - 2, 3, 'F');

        // Label
        pdf.setTextColor(60, 60, 60);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text(item.label, currentX + 9, currentY);

        currentX += colWidth;
      });

      // ====== PAGE 2: Equipment List ======
      if (positions.length > 0) {
        pdf.addPage();

        // Header
        pdf.setFillColor(15, 23, 42);
        pdf.rect(0, 0, pageWidth, 25, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Lista de Equipamentos Posicionados', margin, 16);

        // Table header
        const tableTop = 35;
        const colWidths = [10, 55, 35, 40, 25, 25];
        const headers = ['#', 'Nome', 'Tipo', 'IP', 'Status', 'Posição'];

        pdf.setFillColor(241, 245, 249); // slate-100
        pdf.rect(margin, tableTop, pageWidth - margin * 2, 8, 'F');

        pdf.setTextColor(30, 41, 59);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');

        let headerX = margin + 2;
        headers.forEach((header, i) => {
          pdf.text(header, headerX, tableTop + 5.5);
          headerX += colWidths[i];
        });

        // Table rows
        pdf.setFont('helvetica', 'normal');
        let rowY = tableTop + 14;
        
        positions.forEach((pos, index) => {
          if (rowY > pageHeight - 20) {
            pdf.addPage();
            rowY = 20;
          }

          const equipment = pos.equipment;
          const typeLabel = EQUIPMENT_TYPE_LABELS[equipment?.type || 'other'] || equipment?.type || '-';
          const statusLabel = STATUS_LABELS[equipment?.equipment_status || 'active'] || 'Ativo';
          const posLabel = `${Math.round(pos.position_x * 100)}%, ${Math.round(pos.position_y * 100)}%`;

          // Alternating row colors
          if (index % 2 === 0) {
            pdf.setFillColor(249, 250, 251);
            pdf.rect(margin, rowY - 4, pageWidth - margin * 2, 8, 'F');
          }

          pdf.setTextColor(60, 60, 60);
          pdf.setFontSize(7);

          let cellX = margin + 2;
          const rowData = [
            String(index + 1),
            (pos.custom_label || equipment?.name || '-').substring(0, 28),
            typeLabel.substring(0, 15),
            equipment?.ip_address || '-',
            statusLabel,
            posLabel,
          ];

          rowData.forEach((text, i) => {
            pdf.text(text, cellX, rowY);
            cellX += colWidths[i];
          });

          rowY += 8;
        });

        // Footer
        // Footer for equipment list
        pdf.setTextColor(150, 150, 150);
        pdf.setFontSize(8);
        pdf.text(`Total: ${positions.length} equipamentos`, margin, pageHeight - 10);
        pdf.text(date, pageWidth - margin, pageHeight - 10, { align: 'right' });
      }

      // ====== PAGE 3: Rack List ======
      if (rackPositions.length > 0) {
        pdf.addPage();

        // Header
        pdf.setFillColor(15, 23, 42);
        pdf.rect(0, 0, pageWidth, 25, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Lista de Racks Posicionados', margin, 16);

        // Table header
        const tableTop = 35;
        const rackColWidths = [10, 50, 20, 50, 50];
        const rackHeaders = ['#', 'Nome', 'Tamanho', 'Sala', 'Posição'];

        pdf.setFillColor(241, 245, 249);
        pdf.rect(margin, tableTop, pageWidth - margin * 2, 8, 'F');

        pdf.setTextColor(30, 41, 59);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');

        let headerX = margin + 2;
        rackHeaders.forEach((header, i) => {
          pdf.text(header, headerX, tableTop + 5.5);
          headerX += rackColWidths[i];
        });

        // Table rows
        pdf.setFont('helvetica', 'normal');
        let rowY = tableTop + 14;

        rackPositions.forEach((pos, index) => {
          if (rowY > pageHeight - 20) {
            pdf.addPage();
            rowY = 20;
          }

          const rackName = pos.rack?.name || 'Rack';
          const sizeU = pos.rack?.size_u || 42;
          const roomName = '-'; // Room info not available in current structure
          const posLabel = `${Math.round(pos.position_x)}%, ${Math.round(pos.position_y)}%`;

          // Alternating row colors
          if (index % 2 === 0) {
            pdf.setFillColor(249, 250, 251);
            pdf.rect(margin, rowY - 4, pageWidth - margin * 2, 8, 'F');
          }

          pdf.setTextColor(60, 60, 60);
          pdf.setFontSize(7);

          let cellX = margin + 2;
          const rowData = [
            String(index + 1),
            rackName.substring(0, 25),
            `${sizeU}U`,
            roomName.substring(0, 25),
            posLabel,
          ];

          rowData.forEach((text, i) => {
            pdf.text(text, cellX, rowY);
            cellX += rackColWidths[i];
          });

          rowY += 8;
        });

        // Footer
        pdf.setTextColor(150, 150, 150);
        pdf.setFontSize(8);
        pdf.text(`Total: ${rackPositions.length} racks`, margin, pageHeight - 10);
        pdf.text(date, pageWidth - margin, pageHeight - 10, { align: 'right' });
      }

      pdf.save(getFileName('pdf'));
      toast.success('PDF completo exportado com sucesso');
    } catch (error) {
      console.error('Full PDF export error:', error);
      toast.error('Erro ao exportar PDF completo');
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
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportFullPDF}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          PDF Completo (Legenda + Lista)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
