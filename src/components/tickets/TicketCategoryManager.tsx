import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Tags, FolderTree, Loader2, Users } from 'lucide-react';
import { useTicketCategories, TicketCategory, TicketSubcategory } from '@/hooks/useTicketCategories';
import { useStoredWhatsAppGroups } from '@/hooks/useStoredWhatsAppGroups';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const slugify = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

export function TicketCategoryManager() {
  const {
    categories, subcategories, isLoading,
    createCategory, updateCategory, deleteCategory,
    createSubcategory, updateSubcategory, deleteSubcategory,
  } = useTicketCategories();
  const { data: whatsappGroups = [] } = useStoredWhatsAppGroups();

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [categoryDialog, setCategoryDialog] = useState<{ open: boolean; editing?: TicketCategory }>({ open: false });
  const [subcategoryDialog, setSubcategoryDialog] = useState<{ open: boolean; categoryId: string; editing?: TicketSubcategory }>({ open: false, categoryId: '' });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: 'category' | 'subcategory'; id: string; name: string }>({ open: false, type: 'category', id: '', name: '' });

  const [catForm, setCatForm] = useState({ name: '', slug: '', color: '#3b82f6', icon: '', whatsapp_group_id: '' });
  const [subForm, setSubForm] = useState({ name: '', slug: '' });

  const toggleExpand = (id: string) => {
    const next = new Set(expandedCategories);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpandedCategories(next);
  };

  const openCategoryDialog = (editing?: TicketCategory) => {
    if (editing) {
      setCatForm({ name: editing.name, slug: editing.slug, color: editing.color, icon: editing.icon || '' });
    } else {
      setCatForm({ name: '', slug: '', color: '#3b82f6', icon: '' });
    }
    setCategoryDialog({ open: true, editing });
  };

  const openSubcategoryDialog = (categoryId: string, editing?: TicketSubcategory) => {
    if (editing) {
      setSubForm({ name: editing.name, slug: editing.slug });
    } else {
      setSubForm({ name: '', slug: '' });
    }
    setSubcategoryDialog({ open: true, categoryId, editing });
  };

  const handleSaveCategory = async () => {
    const slug = catForm.slug || slugify(catForm.name);
    if (categoryDialog.editing) {
      await updateCategory.mutateAsync({ id: categoryDialog.editing.id, name: catForm.name, slug, color: catForm.color, icon: catForm.icon || null });
    } else {
      await createCategory.mutateAsync({ name: catForm.name, slug, color: catForm.color, icon: catForm.icon || undefined });
    }
    setCategoryDialog({ open: false });
  };

  const handleSaveSubcategory = async () => {
    const slug = subForm.slug || slugify(subForm.name);
    if (subcategoryDialog.editing) {
      await updateSubcategory.mutateAsync({ id: subcategoryDialog.editing.id, name: subForm.name, slug });
    } else {
      await createSubcategory.mutateAsync({ category_id: subcategoryDialog.categoryId, name: subForm.name, slug });
    }
    setSubcategoryDialog({ open: false, categoryId: '' });
  };

  const handleDelete = async () => {
    if (deleteDialog.type === 'category') {
      await deleteCategory.mutateAsync(deleteDialog.id);
    } else {
      await deleteSubcategory.mutateAsync(deleteDialog.id);
    }
    setDeleteDialog({ open: false, type: 'category', id: '', name: '' });
  };

  const handleToggleActive = async (type: 'category' | 'subcategory', id: string, currentActive: boolean) => {
    if (type === 'category') {
      await updateCategory.mutateAsync({ id, is_active: !currentActive });
    } else {
      await updateSubcategory.mutateAsync({ id, is_active: !currentActive });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Tags className="h-5 w-5" />Categorias</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              Categorias e Subcategorias
            </CardTitle>
            <Button size="sm" onClick={() => openCategoryDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Categoria
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {categories.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma categoria cadastrada</p>
          ) : (
            categories.map(cat => {
              const catSubs = subcategories.filter(s => s.category_id === cat.id);
              const isExpanded = expandedCategories.has(cat.id);

              return (
                <Collapsible key={cat.id} open={isExpanded} onOpenChange={() => toggleExpand(cat.id)}>
                  <div className="border rounded-lg">
                    <div className="flex items-center gap-3 p-3">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </CollapsibleTrigger>

                      <div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      
                      <span className="text-lg">{cat.icon}</span>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{cat.name}</span>
                          <Badge variant="outline" className="text-xs">{cat.slug}</Badge>
                          {!cat.is_active && <Badge variant="secondary" className="text-xs">Inativa</Badge>}
                          <Badge variant="outline" className="text-xs">{catSubs.length} sub</Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Switch checked={cat.is_active} onCheckedChange={() => handleToggleActive('category', cat.id, cat.is_active)} />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openCategoryDialog(cat)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteDialog({ open: true, type: 'category', id: cat.id, name: cat.name })}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <CollapsibleContent>
                      <div className="border-t px-3 py-2 bg-muted/30 space-y-1">
                        {catSubs.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-2 pl-10">Nenhuma subcategoria</p>
                        ) : (
                          catSubs.map(sub => (
                            <div key={sub.id} className="flex items-center gap-3 pl-10 py-1.5">
                              <span className="text-sm flex-1">{sub.name}</span>
                              <Badge variant="outline" className="text-xs">{sub.slug}</Badge>
                              {!sub.is_active && <Badge variant="secondary" className="text-xs">Inativa</Badge>}
                              <Switch checked={sub.is_active} onCheckedChange={() => handleToggleActive('subcategory', sub.id, sub.is_active)} />
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openSubcategoryDialog(cat.id, sub)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setDeleteDialog({ open: true, type: 'subcategory', id: sub.id, name: sub.name })}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))
                        )}
                        <Button variant="outline" size="sm" className="ml-10 mt-1" onClick={() => openSubcategoryDialog(cat.id)}>
                          <Plus className="h-3 w-3 mr-1" />
                          Subcategoria
                        </Button>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Category Dialog */}
      <Dialog open={categoryDialog.open} onOpenChange={(o) => !o && setCategoryDialog({ open: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{categoryDialog.editing ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={catForm.name} onChange={e => { setCatForm(f => ({ ...f, name: e.target.value, slug: f.slug || '' })); }} placeholder="Ex: Hardware" />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={catForm.slug || slugify(catForm.name)} onChange={e => setCatForm(f => ({ ...f, slug: e.target.value }))} placeholder="hardware" />
              <p className="text-xs text-muted-foreground">Identificador único (gerado automaticamente)</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={catForm.color} onChange={e => setCatForm(f => ({ ...f, color: e.target.value }))} className="h-9 w-12 rounded border cursor-pointer" />
                  <Input value={catForm.color} onChange={e => setCatForm(f => ({ ...f, color: e.target.value }))} className="flex-1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Ícone (emoji)</Label>
                <Input value={catForm.icon} onChange={e => setCatForm(f => ({ ...f, icon: e.target.value }))} placeholder="🖥️" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialog({ open: false })}>Cancelar</Button>
            <Button onClick={handleSaveCategory} disabled={!catForm.name || createCategory.isPending || updateCategory.isPending}>
              {(createCategory.isPending || updateCategory.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subcategory Dialog */}
      <Dialog open={subcategoryDialog.open} onOpenChange={(o) => !o && setSubcategoryDialog({ open: false, categoryId: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{subcategoryDialog.editing ? 'Editar Subcategoria' : 'Nova Subcategoria'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={subForm.name} onChange={e => setSubForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Impressora" />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={subForm.slug || slugify(subForm.name)} onChange={e => setSubForm(f => ({ ...f, slug: e.target.value }))} placeholder="impressora" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubcategoryDialog({ open: false, categoryId: '' })}>Cancelar</Button>
            <Button onClick={handleSaveSubcategory} disabled={!subForm.name || createSubcategory.isPending || updateSubcategory.isPending}>
              {(createSubcategory.isPending || updateSubcategory.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(o) => !o && setDeleteDialog(d => ({ ...d, open: false }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {deleteDialog.type === 'category' ? 'a categoria' : 'a subcategoria'} "{deleteDialog.name}"?
              {deleteDialog.type === 'category' && ' Todas as subcategorias serão removidas.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
