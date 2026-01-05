import { useState } from 'react';
import { useLandingContent, LandingContent } from '@/hooks/useLandingContent';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { 
  FileText, 
  Sparkles, 
  Tags, 
  Edit, 
  Trash2, 
  Plus, 
  GripVertical,
  Save,
  X,
  Cable,
  Server,
  Map,
  Network,
  Camera,
  Headset,
  Wifi,
  Shield,
  Zap,
  Database,
  Monitor,
  Settings,
  Bell,
  Clock,
  FileCheck,
  Users,
  Eye,
  Layers,
  AlertCircle
} from 'lucide-react';
import { DialogDescription } from '@radix-ui/react-dialog';

// Mapeamento de ícones disponíveis
const iconOptions = [
  { value: 'Cable', label: 'Cabo', icon: Cable },
  { value: 'Server', label: 'Servidor', icon: Server },
  { value: 'Map', label: 'Mapa', icon: Map },
  { value: 'Network', label: 'Rede', icon: Network },
  { value: 'Camera', label: 'Câmera', icon: Camera },
  { value: 'Headset', label: 'Suporte', icon: Headset },
  { value: 'Wifi', label: 'WiFi', icon: Wifi },
  { value: 'Shield', label: 'Segurança', icon: Shield },
  { value: 'Zap', label: 'Energia', icon: Zap },
  { value: 'Database', label: 'Banco de Dados', icon: Database },
  { value: 'Monitor', label: 'Monitor', icon: Monitor },
  { value: 'Settings', label: 'Configurações', icon: Settings },
  { value: 'Bell', label: 'Notificação', icon: Bell },
  { value: 'Clock', label: 'Tempo', icon: Clock },
  { value: 'FileCheck', label: 'Documento', icon: FileCheck },
  { value: 'Users', label: 'Usuários', icon: Users },
  { value: 'Eye', label: 'Visualização', icon: Eye },
  { value: 'Layers', label: 'Camadas', icon: Layers },
  { value: 'AlertCircle', label: 'Alerta', icon: AlertCircle },
];

const getIconComponent = (iconName: string | null) => {
  const iconOption = iconOptions.find(opt => opt.value === iconName);
  return iconOption?.icon || Cable;
};

interface EditFormProps {
  item: LandingContent;
  onSave: (data: Partial<LandingContent>) => void;
  onCancel: () => void;
  showIcon?: boolean;
}

const EditForm = ({ item, onSave, onCancel, showIcon = false }: EditFormProps) => {
  const [title, setTitle] = useState(item.title || '');
  const [description, setDescription] = useState(item.description || '');
  const [icon, setIcon] = useState(item.icon || 'Cable');

  const handleSubmit = () => {
    onSave({
      id: item.id,
      title: title || null,
      description: description || null,
      icon: showIcon ? icon : item.icon,
    });
  };

  return (
    <div className="space-y-4">
      {item.content_type !== 'highlight' && (
        <div className="space-y-2">
          <Label>Título</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título"
          />
        </div>
      )}
      
      {item.content_type === 'highlight' && (
        <div className="space-y-2">
          <Label>Texto do Badge</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Texto do badge"
          />
        </div>
      )}

      {item.content_type !== 'highlight' && (
        <div className="space-y-2">
          <Label>Descrição</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição"
            rows={3}
          />
        </div>
      )}

      {showIcon && (
        <div className="space-y-2">
          <Label>Ícone</Label>
          <Select value={icon} onValueChange={setIcon}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {iconOptions.map((opt) => {
                const IconComp = opt.icon;
                return (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      <IconComp className="w-4 h-4" />
                      <span>{opt.label}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          <X className="w-4 h-4 mr-1" />
          Cancelar
        </Button>
        <Button size="sm" onClick={handleSubmit}>
          <Save className="w-4 h-4 mr-1" />
          Salvar
        </Button>
      </div>
    </div>
  );
};

interface NewItemFormProps {
  contentType: 'feature' | 'highlight';
  nextOrder: number;
  onCreate: (data: Omit<LandingContent, 'id' | 'created_at' | 'updated_at'>) => void;
  onCancel: () => void;
}

const NewItemForm = ({ contentType, nextOrder, onCreate, onCancel }: NewItemFormProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Cable');

  const handleSubmit = () => {
    if (!title.trim()) return;
    
    onCreate({
      content_key: `${contentType}_${Date.now()}`,
      content_type: contentType,
      title,
      description: contentType === 'feature' ? description : null,
      icon: contentType === 'feature' ? icon : null,
      display_order: nextOrder,
      is_active: true,
    });
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
      <div className="space-y-2">
        <Label>{contentType === 'highlight' ? 'Texto do Badge' : 'Título'}</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={contentType === 'highlight' ? 'Ex: Tempo Real' : 'Título da feature'}
          autoFocus
        />
      </div>

      {contentType === 'feature' && (
        <>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição da feature"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Ícone</Label>
            <Select value={icon} onValueChange={setIcon}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {iconOptions.map((opt) => {
                  const IconComp = opt.icon;
                  return (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <IconComp className="w-4 h-4" />
                        <span>{opt.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button size="sm" onClick={handleSubmit} disabled={!title.trim()}>
          <Plus className="w-4 h-4 mr-1" />
          Adicionar
        </Button>
      </div>
    </div>
  );
};

export const LandingContentEditor = () => {
  const {
    texts,
    features,
    highlights,
    isLoading,
    updateContent,
    createContent,
    deleteContent,
  } = useLandingContent();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingType, setAddingType] = useState<'feature' | 'highlight' | null>(null);

  const handleSave = (data: Partial<LandingContent>) => {
    if (data.id) {
      updateContent.mutate(data as Partial<LandingContent> & { id: string });
      setEditingId(null);
    }
  };

  const handleCreate = (data: Omit<LandingContent, 'id' | 'created_at' | 'updated_at'>) => {
    createContent.mutate(data);
    setAddingType(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja remover este item?')) {
      deleteContent.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Textos e Conteúdo da Landing Page
        </DialogTitle>
        <DialogDescription className="text-muted-foreground">
          Edite os textos, features e badges exibidos na página inicial
        </DialogDescription>
      </DialogHeader>

      {/* Textos Principais */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Textos Principais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {texts.map((text) => (
            <div key={text.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  {text.content_key === 'hero_description' && 'Descrição Hero'}
                  {text.content_key === 'screenshots_title' && 'Seção Screenshots'}
                  {text.content_key === 'highlights_subtitle' && 'Subtítulo Highlights'}
                  {text.content_key === 'highlights_title' && 'Título Highlights'}
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingId(editingId === text.id ? null : text.id)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
              
              {editingId === text.id ? (
                <EditForm
                  item={text}
                  onSave={handleSave}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="p-3 bg-muted/50 rounded-md text-sm">
                  {text.title && <p className="font-medium">{text.title}</p>}
                  {text.description && (
                    <p className="text-muted-foreground mt-1">{text.description}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Separator />

      {/* Features */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Features (Cards)
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddingType(addingType === 'feature' ? null : 'feature')}
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {addingType === 'feature' && (
            <NewItemForm
              contentType="feature"
              nextOrder={features.length + 1}
              onCreate={handleCreate}
              onCancel={() => setAddingType(null)}
            />
          )}

          {features.map((feature) => {
            const IconComp = getIconComponent(feature.icon);
            return (
              <div
                key={feature.id}
                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <GripVertical className="w-4 h-4 text-muted-foreground mt-1 cursor-grab" />
                <div className="p-2 bg-primary/10 rounded-lg">
                  <IconComp className="w-4 h-4 text-primary" />
                </div>
                
                {editingId === feature.id ? (
                  <div className="flex-1">
                    <EditForm
                      item={feature}
                      onSave={handleSave}
                      onCancel={() => setEditingId(null)}
                      showIcon
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{feature.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {feature.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingId(feature.id)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(feature.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Separator />

      {/* Highlights/Badges */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Tags className="w-4 h-4 text-primary" />
              Badges/Highlights
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddingType(addingType === 'highlight' ? null : 'highlight')}
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {addingType === 'highlight' && (
            <div className="mb-4">
              <NewItemForm
                contentType="highlight"
                nextOrder={highlights.length + 1}
                onCreate={handleCreate}
                onCancel={() => setAddingType(null)}
              />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {highlights.map((highlight) => (
              <div key={highlight.id} className="group relative">
                {editingId === highlight.id ? (
                  <div className="p-2 border rounded-lg bg-background min-w-[200px]">
                    <EditForm
                      item={highlight}
                      onSave={handleSave}
                      onCancel={() => setEditingId(null)}
                    />
                  </div>
                ) : (
                  <Badge
                    variant="secondary"
                    className="pr-1 cursor-pointer hover:bg-secondary/80"
                  >
                    <span className="mr-2">{highlight.title}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 hover:bg-transparent"
                      onClick={() => setEditingId(highlight.id)}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-destructive hover:bg-transparent hover:text-destructive"
                      onClick={() => handleDelete(highlight.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
