import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  RotateCcw, 
  Save, 
  FileText,
  Info,
  CheckCircle,
} from 'lucide-react';
import { useWhatsAppTemplates, type WhatsAppTemplate } from '@/hooks/useWhatsAppTemplates';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const TEMPLATE_LABELS: Record<string, { name: string; description: string; icon: string }> = {
  'ticket_created': {
    name: 'Chamado Criado',
    description: 'Enviado quando um novo chamado é aberto',
    icon: '🎫',
  },
  'ticket_status_changed': {
    name: 'Status Alterado',
    description: 'Enviado quando o status de um chamado muda',
    icon: '🔔',
  },
  'alert_critical': {
    name: 'Alerta Crítico',
    description: 'Enviado para alertas de severidade crítica',
    icon: '🚨',
  },
  'alert_warning': {
    name: 'Alerta de Aviso',
    description: 'Enviado para alertas de severidade aviso',
    icon: '⚠️',
  },
  'test': {
    name: 'Mensagem de Teste',
    description: 'Usado para testar a integração',
    icon: '✅',
  },
};

interface TemplateEditorItemProps {
  template: WhatsAppTemplate;
  onSave: (id: string, content: string) => Promise<boolean>;
  onToggle: (id: string, isActive: boolean) => Promise<boolean>;
  onReset: (templateType: string) => Promise<boolean>;
  isSaving: boolean;
}

const TemplateEditorItem = ({ 
  template, 
  onSave, 
  onToggle, 
  onReset,
  isSaving 
}: TemplateEditorItemProps) => {
  const [content, setContent] = useState(template.template_content);
  const [hasChanges, setHasChanges] = useState(false);

  const handleContentChange = (value: string) => {
    setContent(value);
    setHasChanges(value !== template.template_content);
  };

  const handleSave = async () => {
    const success = await onSave(template.id, content);
    if (success) {
      setHasChanges(false);
    }
  };

  const handleReset = async () => {
    const success = await onReset(template.template_type);
    if (success) {
      // Reload will update the content
      setHasChanges(false);
    }
  };

  const label = TEMPLATE_LABELS[template.template_type] || {
    name: template.template_name,
    description: '',
    icon: '📝',
  };

  // Generate preview with sample data
  const previewContent = content
    .replace(/\{\{ticket_number\}\}/g, 'TKT-2025-00001')
    .replace(/\{\{title\}\}/g, 'Problema com servidor')
    .replace(/\{\{priority\}\}/g, 'Alta')
    .replace(/\{\{status\}\}/g, 'Em Andamento')
    .replace(/\{\{status_message\}\}/g, 'O técnico está analisando o problema.')
    .replace(/\{\{message\}\}/g, 'Rack principal atingiu 90% de ocupação.')
    .replace(/\{\{phone\}\}/g, '5511999999999');

  return (
    <AccordionItem value={template.template_type} className="border rounded-lg px-4">
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center gap-3 text-left">
          <span className="text-xl">{label.icon}</span>
          <div>
            <div className="font-medium flex items-center gap-2">
              {label.name}
              {!template.is_active && (
                <Badge variant="secondary" className="text-xs">Desativado</Badge>
              )}
              {hasChanges && (
                <Badge variant="outline" className="text-xs text-orange-500 border-orange-500">
                  Não salvo
                </Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground font-normal">
              {label.description}
            </div>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              id={`active-${template.id}`}
              checked={template.is_active}
              onCheckedChange={(checked) => onToggle(template.id, checked)}
            />
            <Label htmlFor={`active-${template.id}`}>Template ativo</Label>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Conteúdo da Mensagem</Label>
          <Textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            rows={6}
            className="font-mono text-sm"
          />
        </div>

        {template.variables.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Variáveis disponíveis:</Label>
            <div className="flex flex-wrap gap-1">
              {template.variables.map((variable) => (
                <Badge 
                  key={variable} 
                  variant="outline" 
                  className="font-mono text-xs cursor-pointer hover:bg-muted"
                  onClick={() => {
                    setContent(prev => prev + `{{${variable}}}`);
                    setHasChanges(true);
                  }}
                >
                  {`{{${variable}}}`}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Separator />

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Preview:</Label>
          <div className="bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-wrap border">
            {previewContent}
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={isSaving}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Restaurar Padrão
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-1" />
            )}
            Salvar
          </Button>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};

export const WhatsAppTemplateEditor = () => {
  const { 
    templates, 
    isLoading, 
    isSaving, 
    updateTemplate, 
    resetTemplate,
    loadTemplates,
  } = useWhatsAppTemplates();

  const handleSave = async (id: string, content: string) => {
    return updateTemplate(id, { template_content: content });
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    return updateTemplate(id, { is_active: isActive });
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Templates de Mensagens
        </CardTitle>
        <CardDescription>
          Personalize as mensagens enviadas automaticamente via WhatsApp
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Use variáveis como <code className="bg-muted px-1 rounded">{'{{ticket_number}}'}</code> para 
            inserir dados dinâmicos. Clique nas variáveis disponíveis para adicioná-las.
          </AlertDescription>
        </Alert>

        {templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum template encontrado. Verifique se a tabela de templates foi criada corretamente.
          </div>
        ) : (
          <Accordion type="single" collapsible className="space-y-2">
            {templates.map((template) => (
              <TemplateEditorItem
                key={template.id}
                template={template}
                onSave={handleSave}
                onToggle={handleToggle}
                onReset={resetTemplate}
                isSaving={isSaving}
              />
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
};
