import { useState } from 'react';
import { Upload, FileWarning, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ParsedTopic {
  category: string;
  topic: string;
  content: string;
  keywords: string[];
  isValid: boolean;
  errors: string[];
}

interface ImportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parsedTopics: ParsedTopic[];
  onConfirm: () => void;
  isLoading?: boolean;
}

export function ImportPreviewDialog({
  open,
  onOpenChange,
  parsedTopics,
  onConfirm,
  isLoading,
}: ImportPreviewDialogProps) {
  const validTopics = parsedTopics.filter(t => t.isValid);
  const invalidTopics = parsedTopics.filter(t => !t.isValid);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Preview de Importação
          </DialogTitle>
          <DialogDescription>
            Revise os tópicos antes de importar
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 mb-4">
          <Badge variant="default" className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {validTopics.length} válidos
          </Badge>
          {invalidTopics.length > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {invalidTopics.length} com erros
            </Badge>
          )}
        </div>

        <ScrollArea className="h-[400px] border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Status</TableHead>
                <TableHead className="w-[120px]">Categoria</TableHead>
                <TableHead className="w-[200px]">Tópico</TableHead>
                <TableHead>Conteúdo</TableHead>
                <TableHead className="w-[150px]">Keywords</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parsedTopics.map((topic, index) => (
                <TableRow key={index} className={!topic.isValid ? 'bg-destructive/10' : ''}>
                  <TableCell>
                    {topic.isValid ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <div className="flex items-center gap-1">
                        <FileWarning className="h-4 w-4 text-destructive" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{topic.category || '-'}</TableCell>
                  <TableCell>{topic.topic || '-'}</TableCell>
                  <TableCell className="max-w-[300px] truncate">
                    {topic.content ? topic.content.substring(0, 100) + (topic.content.length > 100 ? '...' : '') : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {topic.keywords.slice(0, 3).map((kw, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {kw}
                        </Badge>
                      ))}
                      {topic.keywords.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{topic.keywords.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>

        {invalidTopics.length > 0 && (
          <div className="bg-destructive/10 p-3 rounded-md">
            <h4 className="font-medium text-destructive mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Erros encontrados
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {invalidTopics.slice(0, 5).map((topic, i) => (
                <li key={i}>
                  Linha {parsedTopics.indexOf(topic) + 2}: {topic.errors.join(', ')}
                </li>
              ))}
              {invalidTopics.length > 5 && (
                <li>... e mais {invalidTopics.length - 5} erros</li>
              )}
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={validTopics.length === 0 || isLoading}
          >
            {isLoading ? 'Importando...' : `Importar ${validTopics.length} tópicos`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
