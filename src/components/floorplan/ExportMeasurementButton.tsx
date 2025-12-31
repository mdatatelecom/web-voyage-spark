import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import jsPDF from 'jspdf';

interface MeasurementPoint {
  x: number;
  y: number;
}

interface ExportMeasurementButtonProps {
  points: MeasurementPoint[];
  scale: number; // pixels per meter
  floorPlanName?: string;
  buildingName?: string;
}

export function ExportMeasurementButton({
  points,
  scale,
  floorPlanName = 'Planta',
  buildingName,
}: ExportMeasurementButtonProps) {
  const calculateSegmentDistance = (start: MeasurementPoint, end: MeasurementPoint) => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distancePixels = Math.sqrt(dx * dx + dy * dy);
    return distancePixels / scale;
  };

  const formatDistance = (meters: number) => {
    if (meters >= 1) {
      return `${meters.toFixed(2)} m`;
    }
    return `${(meters * 100).toFixed(1)} cm`;
  };

  // Calculate polygon area using Shoelace formula
  const calculatePolygonArea = () => {
    if (points.length < 3) return 0;
    
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    area = Math.abs(area) / 2;
    
    // Convert from pixels² to meters²
    return area / (scale * scale);
  };

  const exportToPdf = () => {
    if (points.length < 2) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Medições', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Subtitle with floor plan info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const subtitle = buildingName ? `${buildingName} - ${floorPlanName}` : floorPlanName;
    doc.text(subtitle, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Date
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, yPos, { align: 'center' });
    doc.setTextColor(0);
    yPos += 15;

    // Divider
    doc.setDrawColor(200);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;

    // Segments table
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Segmentos Medidos', 20, yPos);
    yPos += 10;

    // Table header
    doc.setFontSize(10);
    doc.setFillColor(240, 240, 240);
    doc.rect(20, yPos - 5, pageWidth - 40, 8, 'F');
    doc.text('Segmento', 25, yPos);
    doc.text('Distância', pageWidth - 60, yPos);
    yPos += 8;

    let totalDistance = 0;

    // Table rows
    doc.setFont('helvetica', 'normal');
    for (let i = 0; i < points.length - 1; i++) {
      const distance = calculateSegmentDistance(points[i], points[i + 1]);
      totalDistance += distance;

      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      doc.text(`Ponto ${i + 1} → Ponto ${i + 2}`, 25, yPos);
      doc.text(formatDistance(distance), pageWidth - 60, yPos);
      yPos += 7;
    }

    yPos += 5;
    doc.setDrawColor(200);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;

    // Summary
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo', 20, yPos);
    yPos += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    // Total points
    doc.text(`Pontos de medição: ${points.length}`, 25, yPos);
    yPos += 7;

    // Total segments
    doc.text(`Segmentos: ${points.length - 1}`, 25, yPos);
    yPos += 7;

    // Total distance
    doc.setFont('helvetica', 'bold');
    doc.text(`Distância total: ${formatDistance(totalDistance)}`, 25, yPos);
    yPos += 10;

    // Area (if polygon with 3+ points)
    if (points.length >= 3) {
      const area = calculatePolygonArea();
      doc.setFont('helvetica', 'normal');
      doc.text(`Área aproximada (polígono fechado): ${area.toFixed(2)} m²`, 25, yPos);
      yPos += 7;
    }

    // Scale info
    yPos += 5;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Escala utilizada: ${scale} pixels/metro`, 25, yPos);

    // Save
    const filename = `medicoes-${floorPlanName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  };

  if (points.length < 2) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8"
          onClick={exportToPdf}
        >
          <FileDown className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Exportar medições como PDF</TooltipContent>
    </Tooltip>
  );
}
