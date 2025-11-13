import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export const useExport = () => {
  const exportToExcel = (data: any[], filename: string, sheetName: string = 'Data') => {
    try {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, `${filename}.xlsx`);
      
      // Log export action
      logExport('xlsx', filename);
      
      toast.success('Arquivo Excel exportado com sucesso!');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Erro ao exportar para Excel');
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    try {
      const ws = XLSX.utils.json_to_sheet(data);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Log export action
      logExport('csv', filename);
      
      toast.success('Arquivo CSV exportado com sucesso!');
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      toast.error('Erro ao exportar para CSV');
    }
  };

  const exportMultiSheetExcel = (sheets: { name: string; data: any[] }[], filename: string) => {
    try {
      const wb = XLSX.utils.book_new();
      
      sheets.forEach(sheet => {
        const ws = XLSX.utils.json_to_sheet(sheet.data);
        XLSX.utils.book_append_sheet(wb, ws, sheet.name);
      });
      
      XLSX.writeFile(wb, `${filename}.xlsx`);
      
      // Log export action
      logExport('xlsx', filename);
      
      toast.success('Relatório Excel exportado com sucesso!');
    } catch (error) {
      console.error('Error exporting multi-sheet Excel:', error);
      toast.error('Erro ao exportar relatório');
    }
  };

  const logExport = async (format: string, type: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('access_logs').insert({
          user_id: user.id,
          action: 'data_exported',
          details: { type, format }
        });
      }
    } catch (error) {
      console.error('Error logging export:', error);
    }
  };

  return {
    exportToExcel,
    exportToCSV,
    exportMultiSheetExcel
  };
};
