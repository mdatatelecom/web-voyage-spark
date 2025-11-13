import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLabels } from '@/hooks/useLabels';
import { useConnections } from '@/hooks/useConnections';
import { Download, Printer, Trash2, MoreHorizontal, Eye, QrCode, ArrowRight, TestTube, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { LabelDialog } from '@/components/labels/LabelDialog';

export default function Labels() {
  const { labels, isLoading, markPrinted, deleteLabel } = useLabels();
  const { connections } = useConnections();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'printed' | 'unprinted'>('all');
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [showLabelDialog, setShowLabelDialog] = useState(false);

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

  const handleTestGeneration = () => {
    if (!connections) return;
    
    // Buscar primeira conexão sem etiqueta
    const connectionWithoutLabel = connections.find(conn => 
      !labels?.some(label => label.connection_id === conn.id)
    );

    if (connectionWithoutLabel) {
      setSelectedConnection(connectionWithoutLabel.id);
      setShowLabelDialog(true);
    }
  };

  // Estatísticas
  const totalLabels = labels?.length || 0;
  const printedLabels = labels?.filter(l => l.print_count > 0).length || 0;
  const totalPrints = labels?.reduce((sum, l) => sum + l.print_count, 0) || 0;
  const lastGenerated = labels?.[0]?.generated_at;

  // Filtros
  const filteredLabels = labels?.filter(label => {
    const matchesSearch = label.connection?.connection_code
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesFilter = 
      filterStatus === 'all' ||
      (filterStatus === 'printed' && label.print_count > 0) ||
      (filterStatus === 'unprinted' && label.print_count === 0);
    
    return matchesSearch && matchesFilter;
  });

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

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total de Etiquetas</div>
            <div className="text-3xl font-bold">{totalLabels}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Etiquetas Impressas</div>
            <div className="text-3xl font-bold">{printedLabels}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total de Impressões</div>
            <div className="text-3xl font-bold">{totalPrints}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Última Geração</div>
            <div className="text-sm font-semibold">
              {lastGenerated ? new Date(lastGenerated).toLocaleDateString('pt-BR') : '-'}
            </div>
          </Card>
        </div>

        {/* Filtros */}
        {totalLabels > 0 && (
          <Card className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por código de conexão..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="printed">Impressas</SelectItem>
                  <SelectItem value="unprinted">Não Impressas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>
        )}

        {/* Tabela ou Estado Vazio */}
        <Card className="p-6">
          {filteredLabels && filteredLabels.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código da Conexão</TableHead>
                  <TableHead>Tipo de Cabo</TableHead>
                  <TableHead>Gerado em</TableHead>
                  <TableHead>Impressões</TableHead>
                  <TableHead>Última Impressão</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLabels.map((label) => (
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
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 space-y-6">
              <div className="flex justify-center">
                <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center">
                  <QrCode className="w-12 h-12 text-muted-foreground" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Nenhuma etiqueta gerada ainda</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Gere etiquetas QR Code para suas conexões e encontre-as aqui
                </p>
              </div>

              <div className="space-y-3 max-w-md mx-auto">
                <div className="text-left space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                      1
                    </div>
                    <p className="text-sm">Vá para a página de <strong>Conexões</strong></p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                      2
                    </div>
                    <p className="text-sm">Clique em <strong>"Gerar Etiqueta"</strong> no card da conexão</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                      3
                    </div>
                    <p className="text-sm">A etiqueta aparecerá aqui automaticamente</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-center pt-4">
                <Button onClick={() => navigate('/connections')}>
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Ir para Conexões
                </Button>
                {connections && connections.length > 0 && (
                  <Button variant="outline" onClick={handleTestGeneration}>
                    <TestTube className="w-4 h-4 mr-2" />
                    Testar Geração
                  </Button>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>

      {selectedConnection && connections && (
        <LabelDialog
          open={showLabelDialog}
          onOpenChange={setShowLabelDialog}
          connection={connections.find(c => c.id === selectedConnection)}
        />
      )}
    </AppLayout>
  );
}
