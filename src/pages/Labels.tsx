import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLabels } from '@/hooks/useLabels';
import { Download, Printer, Trash2, MoreHorizontal, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Labels() {
  const { labels, isLoading, markPrinted, deleteLabel } = useLabels();
  const navigate = useNavigate();

  const handlePrint = (label: any) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Etiqueta ${label.connection?.connection_code}</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                display: flex; 
                flex-direction: column; 
                align-items: center; 
                justify-content: center;
                padding: 20px;
              }
              .label-container {
                border: 2px solid #000;
                padding: 20px;
                text-align: center;
                max-width: 400px;
              }
              .qr-code { margin: 20px 0; }
              .info { margin: 10px 0; font-size: 14px; }
              .code { font-size: 24px; font-weight: bold; margin: 10px 0; }
              @media print {
                body { margin: 0; }
              }
            </style>
          </head>
          <body>
            <div class="label-container">
              <div class="code">${label.connection?.connection_code}</div>
              <img src="${label.qr_code_data}" class="qr-code" alt="QR Code" style="width: 300px; height: 300px;" />
              <div class="info">
                <strong>Cabo:</strong> ${label.connection?.cable_type}
                ${label.connection?.cable_length_meters ? `- ${label.connection.cable_length_meters}m` : ''}
              </div>
            </div>
            <script>
              window.onload = () => {
                window.print();
                window.onafterprint = () => window.close();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      markPrinted(label.id);
    }
  };

  const handleDownload = (label: any) => {
    const link = document.createElement('a');
    link.download = `${label.connection?.connection_code}.png`;
    link.href = label.qr_code_data;
    link.click();
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="text-center py-12">Carregando...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Etiquetas QR Code</h1>
          <p className="text-muted-foreground">
            Gerenciamento de etiquetas geradas para conexões
          </p>
        </div>

        <Card className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código da Conexão</TableHead>
                <TableHead>Tipo de Cabo</TableHead>
                <TableHead>Gerado em</TableHead>
                <TableHead>Gerado por</TableHead>
                <TableHead>Impressões</TableHead>
                <TableHead>Última Impressão</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {labels && labels.length > 0 ? (
                labels.map((label) => (
                  <TableRow key={label.id}>
                    <TableCell>
                      <Button
                        variant="link"
                        className="p-0 h-auto font-medium"
                        onClick={() => navigate(`/connections/${label.connection_id}`)}
                      >
                        {label.connection?.connection_code}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{label.connection?.cable_type}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(label.generated_at).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      -
                    </TableCell>
                    <TableCell>
                      <Badge variant={label.print_count > 0 ? 'default' : 'secondary'}>
                        {label.print_count}x
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {label.printed_at
                        ? new Date(label.printed_at).toLocaleString('pt-BR')
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => navigate(`/connections/${label.connection_id}`)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Conexão
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePrint(label)}>
                            <Printer className="w-4 h-4 mr-2" />
                            Imprimir
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload(label)}>
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => deleteLabel(label.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    Nenhuma etiqueta gerada ainda
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </AppLayout>
  );
}
