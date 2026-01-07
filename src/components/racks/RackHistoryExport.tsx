import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Download, FileSpreadsheet, FileText, CalendarIcon, Loader2 } from 'lucide-react';
import { format, subDays, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

interface RackHistoryExportProps {
  rackId: string;
  rackName: string;
  location?: string;
}

type ActionFilter = 'all' | 'installed' | 'removed' | 'moved';

export function RackHistoryExport({ rackId, rackName, location }: RackHistoryExportProps) {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(subMonths(new Date(), 1));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all');
  const [exporting, setExporting] = useState(false);

  const { data: history, isLoading } = useQuery({
    queryKey: ['rack-history-export', rackId, startDate, endDate, actionFilter],
    queryFn: async () => {
      if (!rackId) return [];
      
      let query = supabase
        .from('rack_occupancy_history')
        .select(`
          *,
          previous_rack:racks!rack_occupancy_history_previous_rack_id_fkey(name)
        `)
        .eq('rack_id', rackId)
        .order('created_at', { ascending: false });
      
      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endOfDay.toISOString());
      }
      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!rackId,
  });

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'installed': return 'Instalado';
      case 'removed': return 'Removido';
      case 'moved': return 'Movido';
      default: return action;
    }
  };

  const getActionEmoji = (action: string) => {
    switch (action) {
      case 'installed': return '🟢';
      case 'removed': return '🔴';
      case 'moved': return '🔄';
      default: return '⚪';
    }
  };

  const handleExportPDF = async () => {
    if (!history || history.length === 0) {
      toast.error('Nenhum registro para exportar');
      return;
    }

    setExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPosition = 20;

      // Header
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('HISTÓRICO DE OCUPAÇÃO DO RACK', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      doc.setFontSize(14);
      doc.text(rackName, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 7;

      if (location) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(location, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 7;
      }

      // Period
      doc.setFontSize(10);
      const periodText = `Período: ${startDate ? format(startDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Início'} a ${endDate ? format(endDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Hoje'}`;
      doc.text(periodText, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Summary
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('RESUMO', 20, yPosition);
      yPosition += 8;

      const installed = history.filter(h => h.action === 'installed').length;
      const removed = history.filter(h => h.action === 'removed').length;
      const moved = history.filter(h => h.action === 'moved').length;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total de eventos: ${history.length}`, 20, yPosition);
      yPosition += 6;
      doc.text(`Instalações: ${installed} | Remoções: ${removed} | Movimentações: ${moved}`, 20, yPosition);
      yPosition += 15;

      // Timeline
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('TIMELINE DE EVENTOS', 20, yPosition);
      yPosition += 10;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      history.forEach((event, index) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }

        const date = new Date(event.created_at);
        const dateStr = format(date, 'dd/MM/yyyy HH:mm', { locale: ptBR });
        const actionLabel = getActionLabel(event.action);
        const sideLabel = event.mount_side === 'front' ? 'Frontal' : event.mount_side === 'rear' ? 'Traseiro' : event.mount_side || 'N/A';

        doc.setFont('helvetica', 'bold');
        doc.text(`${dateStr} - ${event.equipment_name} (${actionLabel})`, 20, yPosition);
        yPosition += 5;

        doc.setFont('helvetica', 'normal');
        doc.text(`Posição: U${event.position_u_start}-U${event.position_u_end} | Lado: ${sideLabel}`, 25, yPosition);
        yPosition += 5;

        if (event.action === 'moved' && event.previous_rack?.name) {
          doc.text(`Rack anterior: ${event.previous_rack.name}`, 25, yPosition);
          yPosition += 5;
        }

        if (event.notes) {
          doc.text(`Obs: ${event.notes}`, 25, yPosition);
          yPosition += 5;
        }

        yPosition += 3;
      });

      // Footer
      doc.setFontSize(8);
      doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth / 2, 290, { align: 'center' });

      doc.save(`historico-${rackName.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('PDF exportado com sucesso!');
      setOpen(false);
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar PDF');
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    if (!history || history.length === 0) {
      toast.error('Nenhum registro para exportar');
      return;
    }

    setExporting(true);
    try {
      const data = history.map((event) => ({
        'Data': format(new Date(event.created_at), 'dd/MM/yyyy', { locale: ptBR }),
        'Hora': format(new Date(event.created_at), 'HH:mm:ss', { locale: ptBR }),
        'Equipamento': event.equipment_name,
        'Ação': getActionLabel(event.action),
        'U Início': event.position_u_start,
        'U Fim': event.position_u_end,
        'Lado': event.mount_side === 'front' ? 'Frontal' : event.mount_side === 'rear' ? 'Traseiro' : event.mount_side || 'N/A',
        'Rack Anterior': event.previous_rack?.name || '',
        'Observações': event.notes || '',
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Histórico');

      // Set column widths
      ws['!cols'] = [
        { wch: 12 },
        { wch: 10 },
        { wch: 25 },
        { wch: 12 },
        { wch: 8 },
        { wch: 8 },
        { wch: 10 },
        { wch: 20 },
        { wch: 30 },
      ];

      XLSX.writeFile(wb, `historico-${rackName.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      toast.success('Excel exportado com sucesso!');
      setOpen(false);
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      toast.error('Erro ao exportar Excel');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Exportar Histórico de Ocupação</DialogTitle>
          <DialogDescription>
            Selecione o período e tipo de ação para exportar o histórico do rack {rackName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Period Filters */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Inicial</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !startDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Data Final</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !endDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Quick Periods */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStartDate(subDays(new Date(), 7));
                setEndDate(new Date());
              }}
            >
              Últimos 7 dias
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStartDate(subMonths(new Date(), 1));
                setEndDate(new Date());
              }}
            >
              Último mês
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStartDate(subMonths(new Date(), 3));
                setEndDate(new Date());
              }}
            >
              Últimos 3 meses
            </Button>
          </div>

          {/* Action Filter */}
          <div className="space-y-2">
            <Label>Tipo de Ação</Label>
            <Select value={actionFilter} onValueChange={(v) => setActionFilter(v as ActionFilter)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                <SelectItem value="installed">🟢 Instalações</SelectItem>
                <SelectItem value="removed">🔴 Remoções</SelectItem>
                <SelectItem value="moved">🔄 Movimentações</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          <div className="border rounded-lg p-3 bg-muted/50">
            <p className="text-sm text-muted-foreground">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando...
                </span>
              ) : (
                <>
                  <strong>{history?.length || 0}</strong> registros encontrados no período selecionado
                </>
              )}
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={exporting || isLoading || !history?.length}
          >
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="mr-2 h-4 w-4" />
            )}
            Excel
          </Button>
          <Button
            onClick={handleExportPDF}
            disabled={exporting || isLoading || !history?.length}
          >
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
