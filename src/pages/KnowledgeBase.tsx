import { useState } from 'react';
import { Plus, Search, BookOpen, Edit, Trash2, Tag, Brain, FileText } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useKnowledgeBase, KnowledgeTopic } from '@/hooks/useKnowledgeBase';
import { KnowledgeDialog } from '@/components/ai/KnowledgeDialog';

const CATEGORY_LABELS: Record<string, string> = {
  geral: 'Geral',
  alertas: 'Alertas',
  chamados: 'Chamados',
  equipamentos: 'Equipamentos',
  conexoes: 'Conexões',
  whatsapp: 'WhatsApp',
  racks: 'Racks',
  cftv: 'CFTV',
  etiquetas: 'Etiquetas',
  dashboard: 'Dashboard',
  configuracoes: 'Configurações',
  usuarios: 'Usuários',
};

export default function KnowledgeBase() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<KnowledgeTopic | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const {
    topics,
    isLoading,
    categories,
    createTopic,
    updateTopic,
    deleteTopic,
    isCreating,
    isUpdating,
    isDeleting,
  } = useKnowledgeBase(
    categoryFilter || undefined,
    searchQuery || undefined
  );

  const handleOpenCreate = () => {
    setEditingTopic(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (topic: KnowledgeTopic) => {
    setEditingTopic(topic);
    setDialogOpen(true);
  };

  const handleSave = (data: { category: string; topic: string; content: string; keywords: string[] }) => {
    if (editingTopic) {
      updateTopic({ id: editingTopic.id, ...data }, {
        onSuccess: () => setDialogOpen(false),
      });
    } else {
      createTopic(data, {
        onSuccess: () => setDialogOpen(false),
      });
    }
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteTopic(deleteId, {
        onSuccess: () => setDeleteId(null),
      });
    }
  };

  // Group topics by category
  const groupedTopics = topics?.reduce((acc, topic) => {
    if (!acc[topic.category]) {
      acc[topic.category] = [];
    }
    acc[topic.category].push(topic);
    return acc;
  }, {} as Record<string, KnowledgeTopic[]>) || {};

  const totalTopics = topics?.length || 0;
  const categoryCount = Object.keys(groupedTopics).length;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              Base de Conhecimento
            </h1>
            <p className="text-muted-foreground">
              Gerencie os tópicos que o assistente IA utiliza para responder perguntas
            </p>
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Tópico
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Tópicos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTopics}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Categorias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{categoryCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Palavras-chave
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {topics?.reduce((acc, t) => acc + (t.keywords?.length || 0), 0) || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar tópicos..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Todas categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas categorias</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>
                  {CATEGORY_LABELS[cat] || cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : Object.keys(groupedTopics).length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Nenhum tópico encontrado</h3>
              <p className="text-muted-foreground text-center max-w-md mt-2">
                {searchQuery || categoryFilter
                  ? 'Tente ajustar os filtros de busca'
                  : 'Comece adicionando tópicos à base de conhecimento'}
              </p>
              {!searchQuery && !categoryFilter && (
                <Button className="mt-4" onClick={handleOpenCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar primeiro tópico
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Accordion type="multiple" className="space-y-2">
            {Object.entries(groupedTopics).map(([category, topicsInCategory]) => (
              <AccordionItem
                key={category}
                value={category}
                className="border rounded-lg px-4"
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="font-semibold">
                      {CATEGORY_LABELS[category] || category}
                    </span>
                    <Badge variant="secondary">{topicsInCategory.length}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    {topicsInCategory.map(topic => (
                      <Card key={topic.id} className="bg-muted/30">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <CardTitle className="text-base">{topic.topic}</CardTitle>
                              {topic.keywords && topic.keywords.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {topic.keywords.map(kw => (
                                    <Badge key={kw} variant="outline" className="text-xs">
                                      <Tag className="h-3 w-3 mr-1" />
                                      {kw}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenEdit(topic)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteId(topic.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <CardDescription className="whitespace-pre-wrap text-sm">
                            {topic.content.length > 300
                              ? `${topic.content.substring(0, 300)}...`
                              : topic.content}
                          </CardDescription>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <KnowledgeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        topic={editingTopic}
        existingCategories={categories}
        onSave={handleSave}
        isLoading={isCreating || isUpdating}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tópico?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O tópico será removido permanentemente
              da base de conhecimento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
