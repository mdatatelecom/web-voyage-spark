import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WhatsAppTemplate {
  id: string;
  template_type: string;
  template_name: string;
  template_content: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useWhatsAppTemplates = () => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .order('template_type');

      if (error) throw error;

      setTemplates(data || []);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os templates.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateTemplate = async (
    id: string, 
    updates: Partial<Pick<WhatsAppTemplate, 'template_content' | 'template_name' | 'is_active'>>
  ) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('whatsapp_templates')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      setTemplates(prev => 
        prev.map(t => t.id === id ? { ...t, ...updates } : t)
      );

      toast({
        title: 'Template atualizado',
        description: 'O template foi salvo com sucesso.',
      });

      return true;
    } catch (error) {
      console.error('Erro ao atualizar template:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o template.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const resetTemplate = async (templateType: string) => {
    const defaultTemplates: Record<string, string> = {
      'ticket_created': '🎫 *Novo Chamado Aberto*\n\nNúmero: *{{ticket_number}}*\nTítulo: {{title}}\nPrioridade: {{priority}}\n\nAcompanhe pelo sistema.',
      'ticket_status_changed': '🔔 *Atualização de Chamado*\n\nChamado: *{{ticket_number}}*\nNovo Status: {{status}}\n\n{{status_message}}',
      'alert_critical': '🚨 *ALERTA CRÍTICO*\n\n{{title}}\n\n{{message}}\n\nAcesse o sistema para detalhes.',
      'alert_warning': '⚠️ *Aviso do Sistema*\n\n{{title}}\n\n{{message}}',
      'test': '✅ Teste de integração WhatsApp realizado com sucesso!\n\n*Sistema de Racks*',
    };

    const defaultContent = defaultTemplates[templateType];
    if (!defaultContent) return false;

    const template = templates.find(t => t.template_type === templateType);
    if (!template) return false;

    return updateTemplate(template.id, { template_content: defaultContent });
  };

  const applyTemplate = (
    templateType: string,
    variables: Record<string, string>
  ): string | null => {
    const template = templates.find(t => t.template_type === templateType && t.is_active);
    if (!template) return null;

    let content = template.template_content;
    
    Object.entries(variables).forEach(([key, value]) => {
      content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });

    return content;
  };

  const getTemplate = (templateType: string): WhatsAppTemplate | null => {
    return templates.find(t => t.template_type === templateType) || null;
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  return {
    templates,
    isLoading,
    isSaving,
    loadTemplates,
    updateTemplate,
    resetTemplate,
    applyTemplate,
    getTemplate,
  };
};
