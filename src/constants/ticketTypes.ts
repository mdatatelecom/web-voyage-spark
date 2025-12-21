export const TICKET_CATEGORIES = [
  { value: 'hardware', label: 'Hardware', color: 'bg-blue-500' },
  { value: 'software', label: 'Software', color: 'bg-purple-500' },
  { value: 'network', label: 'Rede', color: 'bg-green-500' },
  { value: 'access', label: 'Acesso', color: 'bg-yellow-500' },
  { value: 'maintenance', label: 'Manutenção', color: 'bg-orange-500' },
  { value: 'installation', label: 'Instalação', color: 'bg-cyan-500' },
  { value: 'other', label: 'Outros', color: 'bg-gray-500' },
] as const;

export const TICKET_PRIORITIES = [
  { value: 'low', label: 'Baixa', color: 'bg-green-500', icon: '🟢' },
  { value: 'medium', label: 'Média', color: 'bg-yellow-500', icon: '🟡' },
  { value: 'high', label: 'Alta', color: 'bg-orange-500', icon: '🟠' },
  { value: 'critical', label: 'Crítica', color: 'bg-red-500', icon: '🔴' },
] as const;

export const TICKET_STATUSES = [
  { value: 'open', label: 'Aberto', color: 'bg-blue-500', variant: 'default' as const },
  { value: 'in_progress', label: 'Em Andamento', color: 'bg-yellow-500', variant: 'secondary' as const },
  { value: 'resolved', label: 'Resolvido', color: 'bg-green-500', variant: 'outline' as const },
  { value: 'closed', label: 'Fechado', color: 'bg-gray-500', variant: 'outline' as const },
] as const;

export type TicketCategory = typeof TICKET_CATEGORIES[number]['value'];
export type TicketPriority = typeof TICKET_PRIORITIES[number]['value'];
export type TicketStatus = typeof TICKET_STATUSES[number]['value'];

export const getCategoryLabel = (value: string) => 
  TICKET_CATEGORIES.find(c => c.value === value)?.label || value;

export const getPriorityLabel = (value: string) => 
  TICKET_PRIORITIES.find(p => p.value === value)?.label || value;

export const getStatusLabel = (value: string) => 
  TICKET_STATUSES.find(s => s.value === value)?.label || value;

export const getPriorityColor = (value: string) => 
  TICKET_PRIORITIES.find(p => p.value === value)?.color || 'bg-gray-500';

export const getStatusVariant = (value: string) => 
  TICKET_STATUSES.find(s => s.value === value)?.variant || 'default';
