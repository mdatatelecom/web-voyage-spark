import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X, Plus, Tag } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { KnowledgeTopic } from '@/hooks/useKnowledgeBase';

const formSchema = z.object({
  category: z.string().min(1, 'Categoria é obrigatória'),
  topic: z.string().min(1, 'Tópico é obrigatório'),
  content: z.string().min(10, 'Conteúdo deve ter pelo menos 10 caracteres'),
});

type FormData = z.infer<typeof formSchema>;

const CATEGORIES = [
  { value: 'geral', label: 'Geral' },
  { value: 'alertas', label: 'Alertas' },
  { value: 'chamados', label: 'Chamados' },
  { value: 'equipamentos', label: 'Equipamentos' },
  { value: 'conexoes', label: 'Conexões' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'racks', label: 'Racks' },
  { value: 'cftv', label: 'CFTV' },
  { value: 'etiquetas', label: 'Etiquetas' },
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'configuracoes', label: 'Configurações' },
  { value: 'usuarios', label: 'Usuários' },
];

interface KnowledgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topic?: KnowledgeTopic | null;
  existingCategories: string[];
  onSave: (data: FormData & { keywords: string[] }) => void;
  isLoading?: boolean;
}

export function KnowledgeDialog({
  open,
  onOpenChange,
  topic,
  existingCategories,
  onSave,
  isLoading,
}: KnowledgeDialogProps) {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: '',
      topic: '',
      content: '',
    },
  });

  useEffect(() => {
    if (topic) {
      form.reset({
        category: topic.category,
        topic: topic.topic,
        content: topic.content,
      });
      setKeywords(topic.keywords || []);
    } else {
      form.reset({
        category: '',
        topic: '',
        content: '',
      });
      setKeywords([]);
    }
  }, [topic, form]);

  const handleAddKeyword = () => {
    const trimmed = keywordInput.trim().toLowerCase();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  const handleKeywordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const onSubmit = (data: FormData) => {
    onSave({ ...data, keywords });
  };

  // Merge predefined categories with existing ones
  const allCategories = [...new Set([
    ...CATEGORIES.map(c => c.value),
    ...existingCategories,
  ])];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {topic ? 'Editar Tópico' : 'Adicionar Tópico'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {allCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {CATEGORIES.find(c => c.value === cat)?.label || cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="topic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tópico</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Como criar um novo chamado" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conteúdo</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva detalhadamente o tópico. Use markdown para formatação."
                      className="min-h-[200px] font-mono text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Use markdown para formatação (listas, negrito, código, etc.)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Palavras-chave</FormLabel>
              <div className="flex gap-2">
                <Input
                  placeholder="Digite uma palavra-chave"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={handleKeywordKeyDown}
                />
                <Button type="button" variant="outline" onClick={handleAddKeyword}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {keywords.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {keywords.map(keyword => (
                    <Badge
                      key={keyword}
                      variant="secondary"
                      className="gap-1 cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleRemoveKeyword(keyword)}
                    >
                      <Tag className="h-3 w-3" />
                      {keyword}
                      <X className="h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Palavras-chave ajudam a IA a encontrar este tópico
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Salvando...' : topic ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
