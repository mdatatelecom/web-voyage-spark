import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Server, 
  Cpu, 
  Cable, 
  Network, 
  QrCode, 
  Ticket, 
  Tag,
  LayoutGrid,
  Map,
  Settings,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickAccessItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  color: string;
}

const quickAccessItems: QuickAccessItem[] = [
  { id: 'buildings', label: 'Localizações', icon: <Building2 className="h-5 w-5" />, path: '/buildings', color: 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20' },
  { id: 'racks', label: 'Racks', icon: <Server className="h-5 w-5" />, path: '/racks', color: 'bg-green-500/10 text-green-600 hover:bg-green-500/20' },
  { id: 'equipment', label: 'Equipamentos', icon: <Cpu className="h-5 w-5" />, path: '/equipment', color: 'bg-purple-500/10 text-purple-600 hover:bg-purple-500/20' },
  { id: 'connections', label: 'Conexões', icon: <Cable className="h-5 w-5" />, path: '/connections', color: 'bg-orange-500/10 text-orange-600 hover:bg-orange-500/20' },
  { id: 'network', label: 'Rede', icon: <Network className="h-5 w-5" />, path: '/network-map', color: 'bg-cyan-500/10 text-cyan-600 hover:bg-cyan-500/20' },
  { id: 'scanner', label: 'Scanner QR', icon: <QrCode className="h-5 w-5" />, path: '/scanner', color: 'bg-pink-500/10 text-pink-600 hover:bg-pink-500/20' },
  { id: 'tickets', label: 'Chamados', icon: <Ticket className="h-5 w-5" />, path: '/tickets', color: 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20' },
  { id: 'labels', label: 'Etiquetas', icon: <Tag className="h-5 w-5" />, path: '/labels', color: 'bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20' },
  { id: 'floorplan', label: 'Planta Baixa', icon: <Map className="h-5 w-5" />, path: '/floor-plan', color: 'bg-teal-500/10 text-teal-600 hover:bg-teal-500/20' },
  { id: 'ipam', label: 'IPAM', icon: <LayoutGrid className="h-5 w-5" />, path: '/ipam', color: 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20' },
];

export const QuickAccessWidget: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-5 gap-2 h-full">
      {quickAccessItems.map((item) => (
        <button
          key={item.id}
          onClick={() => navigate(item.path)}
          className={cn(
            "flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg",
            "transition-all duration-200 hover:scale-105",
            "border border-transparent hover:border-border/50",
            item.color
          )}
        >
          {item.icon}
          <span className="text-xs font-medium text-center leading-tight">
            {item.label}
          </span>
        </button>
      ))}
    </div>
  );
};
