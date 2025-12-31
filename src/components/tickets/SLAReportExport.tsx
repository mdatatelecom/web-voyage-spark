import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { FileDown, Loader2, FileText, TrendingUp, Users, BarChart3 } from 'lucide-react';
import { useTicketStats, formatResolutionTime } from '@/hooks/useTicketStats';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface SLAReportExportProps {
  className?: string;
}

export const SLAReportExport = ({ className }: SLAReportExportProps) => {
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState('6months');
  const [generating, setGenerating] = useState(false);
  const { data: stats, isLoading } = useTicketStats();
  const { branding } = useSystemSettings();

  const generateRecommendations = () => {
    if (!stats) return [];
    
    const recommendations: { type: 'error' | 'warning' | 'success'; icon: string; text: string }[] = [];

    // SLA Analysis
    if (stats.slaCompliance < 80) {
      recommendations.push({
        type: 'error',
        icon: '🔴',
        text: `SLA Crítico em ${stats.slaCompliance}% - Ação imediata necessária para recuperar o nível de serviço.`
      });
    } else if (stats.slaCompliance < 90) {
      recommendations.push({
        type: 'warning',
        icon: '⚠️',
        text: `SLA em ${stats.slaCompliance}% está abaixo da meta de 90%. Considere revisar processos de atendimento.`
      });
    } else {
      recommendations.push({
        type: 'success',
        icon: '✅',
        text: `Excelente! SLA em ${stats.slaCompliance}% está acima da meta.`
      });
    }

    // Overdue tickets
    if (stats.overdueTickets > 0) {
      recommendations.push({
        type: 'error',
        icon: '🔴',
        text: `${stats.overdueTickets} chamado(s) atrasado(s) requer(em) atenção imediata.`
      });
    }

    // Category analysis
    const lowSLACategories = stats.slaByCategory.filter(c => c.compliance < 80);
    if (lowSLACategories.length > 0) {
      lowSLACategories.forEach(cat => {
        recommendations.push({
          type: 'warning',
          icon: '⚠️',
          text: `Categoria "${cat.label}" com SLA de ${cat.compliance}%. Considere adicionar recursos ou treinamento.`
        });
      });
    }

    // Best technician
    const bestTech = stats.slaByTechnician.sort((a, b) => b.compliance - a.compliance)[0];
    if (bestTech && bestTech.compliance >= 90) {
      recommendations.push({
        type: 'success',
        icon: '⭐',
        text: `${bestTech.name} com melhor performance (${bestTech.compliance}%). Modelo de boas práticas.`
      });
    }

    // Low performing technicians
    const lowTechs = stats.slaByTechnician.filter(t => t.compliance < 70);
    if (lowTechs.length > 0) {
      recommendations.push({
        type: 'warning',
        icon: '📊',
        text: `${lowTechs.length} técnico(s) com SLA abaixo de 70%. Considere treinamento adicional.`
      });
    }

    // Resolution time
    if (stats.avgResolutionTimeMinutes > 480) { // > 8 hours
      recommendations.push({
        type: 'warning',
        icon: '⏱️',
        text: `Tempo médio de resolução de ${formatResolutionTime(stats.avgResolutionTimeMinutes)} está alto. Revise processos.`
      });
    }

    return recommendations;
  };

  const handleExport = async () => {
    if (!stats) {
      toast.error('Dados não disponíveis');
      return;
    }

    setGenerating(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let y = 20;

      // Header
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('RELATÓRIO DE PERFORMANCE SLA', pageWidth / 2, y, { align: 'center' });
      y += 10;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(branding.systemName, pageWidth / 2, y, { align: 'center' });
      y += 8;
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Gerado em: ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth / 2, y, { align: 'center' });
      doc.setTextColor(0);
      y += 15;

      // Divider
      doc.setDrawColor(200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 15;

      // Executive Summary
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('RESUMO EXECUTIVO', margin, y);
      y += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const summaryData = [
        ['SLA Geral:', `${stats.slaCompliance}%`],
        ['Total de Chamados:', `${stats.totalTickets}`],
        ['Chamados Resolvidos:', `${stats.resolvedTickets + stats.closedTickets}`],
        ['Chamados em Aberto:', `${stats.openTickets + stats.inProgressTickets}`],
        ['Atrasados:', `${stats.overdueTickets}`],
        ['Tempo Médio de Resolução:', formatResolutionTime(stats.avgResolutionTimeMinutes)]
      ];

      summaryData.forEach(([label, value]) => {
        doc.text(label, margin, y);
        doc.setFont('helvetica', 'bold');
        doc.text(value, margin + 60, y);
        doc.setFont('helvetica', 'normal');
        y += 7;
      });
      y += 10;

      // SLA by Category
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('PERFORMANCE POR CATEGORIA', margin, y);
      y += 10;

      doc.setFontSize(9);
      // Table header
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y - 4, pageWidth - margin * 2, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('Categoria', margin + 2, y);
      doc.text('Total', margin + 60, y);
      doc.text('No Prazo', margin + 85, y);
      doc.text('SLA %', margin + 115, y);
      y += 10;

      doc.setFont('helvetica', 'normal');
      stats.slaByCategory.forEach(cat => {
        doc.text(cat.label, margin + 2, y);
        doc.text(String(cat.total), margin + 60, y);
        doc.text(String(cat.onTime), margin + 85, y);
        
        // Color code SLA
        if (cat.compliance >= 90) {
          doc.setTextColor(34, 139, 34);
        } else if (cat.compliance >= 80) {
          doc.setTextColor(255, 165, 0);
        } else {
          doc.setTextColor(220, 53, 69);
        }
        doc.text(`${cat.compliance}%`, margin + 115, y);
        doc.setTextColor(0);
        y += 7;
      });
      y += 10;

      // Check if we need a new page
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      // SLA by Technician
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('PERFORMANCE POR TÉCNICO', margin, y);
      y += 10;

      doc.setFontSize(9);
      // Table header
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y - 4, pageWidth - margin * 2, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('Técnico', margin + 2, y);
      doc.text('Total', margin + 70, y);
      doc.text('No Prazo', margin + 95, y);
      doc.text('Atraso', margin + 120, y);
      doc.text('SLA %', margin + 145, y);
      y += 10;

      doc.setFont('helvetica', 'normal');
      stats.slaByTechnician.slice(0, 10).forEach(tech => {
        const name = tech.name.length > 25 ? tech.name.substring(0, 22) + '...' : tech.name;
        doc.text(name, margin + 2, y);
        doc.text(String(tech.total), margin + 70, y);
        doc.text(String(tech.onTime), margin + 95, y);
        doc.text(String(tech.overdue), margin + 120, y);
        
        // Color code SLA
        if (tech.compliance >= 90) {
          doc.setTextColor(34, 139, 34);
        } else if (tech.compliance >= 80) {
          doc.setTextColor(255, 165, 0);
        } else {
          doc.setTextColor(220, 53, 69);
        }
        doc.text(`${tech.compliance}%`, margin + 145, y);
        doc.setTextColor(0);
        y += 7;
      });
      y += 10;

      // Check if we need a new page
      if (y > 200) {
        doc.addPage();
        y = 20;
      }

      // Recommendations
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('RECOMENDAÇÕES AUTOMÁTICAS', margin, y);
      y += 10;

      const recommendations = generateRecommendations();
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      recommendations.forEach(rec => {
        // Set color based on type
        if (rec.type === 'error') {
          doc.setTextColor(220, 53, 69);
        } else if (rec.type === 'warning') {
          doc.setTextColor(255, 165, 0);
        } else {
          doc.setTextColor(34, 139, 34);
        }
        
        const lines = doc.splitTextToSize(`${rec.icon} ${rec.text}`, pageWidth - margin * 2);
        lines.forEach((line: string) => {
          if (y > 280) {
            doc.addPage();
            y = 20;
          }
          doc.text(line, margin, y);
          y += 6;
        });
        y += 4;
      });
      doc.setTextColor(0);

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Página ${i} de ${pageCount} | ${branding.systemName} - Relatório Confidencial`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Save
      const fileName = `relatorio-sla-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
      doc.save(fileName);
      
      toast.success('Relatório exportado com sucesso!');
      setOpen(false);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar relatório');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={className}>
          <FileDown className="h-4 w-4 mr-2" />
          Exportar Relatório SLA
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Exportar Relatório de SLA
          </DialogTitle>
          <DialogDescription>
            Gere um relatório PDF completo com métricas de performance e recomendações automáticas
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Preview cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 border rounded-lg text-center">
              <BarChart3 className="h-6 w-6 mx-auto mb-1 text-primary" />
              <p className="text-xs text-muted-foreground">Métricas Gerais</p>
            </div>
            <div className="p-3 border rounded-lg text-center">
              <Users className="h-6 w-6 mx-auto mb-1 text-primary" />
              <p className="text-xs text-muted-foreground">Por Técnico</p>
            </div>
            <div className="p-3 border rounded-lg text-center">
              <TrendingUp className="h-6 w-6 mx-auto mb-1 text-primary" />
              <p className="text-xs text-muted-foreground">Recomendações</p>
            </div>
          </div>

          {/* Period selector */}
          <div className="space-y-2">
            <Label>Período do Relatório</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1month">Último mês</SelectItem>
                <SelectItem value="3months">Últimos 3 meses</SelectItem>
                <SelectItem value="6months">Últimos 6 meses</SelectItem>
                <SelectItem value="1year">Último ano</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Current stats preview */}
          {stats && (
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <p className="text-sm font-medium">Prévia dos dados:</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">SLA Atual:</span>
                  <span className="ml-2 font-medium">{stats.slaCompliance}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total:</span>
                  <span className="ml-2 font-medium">{stats.totalTickets} chamados</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Categorias:</span>
                  <span className="ml-2 font-medium">{stats.slaByCategory.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Técnicos:</span>
                  <span className="ml-2 font-medium">{stats.slaByTechnician.length}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={generating || isLoading}>
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4 mr-2" />
                Exportar PDF
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
