import { useLocation, useParams, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const Breadcrumb = () => {
  const location = useLocation();
  const params = useParams();

  // Fetch data for dynamic breadcrumb names
  const { data: building } = useQuery({
    queryKey: ['building', params.buildingId],
    queryFn: async () => {
      if (!params.buildingId) return null;
      const { data } = await supabase
        .from('buildings')
        .select('name')
        .eq('id', params.buildingId)
        .single();
      return data;
    },
    enabled: !!params.buildingId,
  });

  const { data: floor } = useQuery({
    queryKey: ['floor', params.floorId],
    queryFn: async () => {
      if (!params.floorId) return null;
      const { data } = await supabase
        .from('floors')
        .select('name')
        .eq('id', params.floorId)
        .single();
      return data;
    },
    enabled: !!params.floorId,
  });

  const { data: room } = useQuery({
    queryKey: ['room', params.roomId],
    queryFn: async () => {
      if (!params.roomId) return null;
      const { data } = await supabase
        .from('rooms')
        .select('name')
        .eq('id', params.roomId)
        .single();
      return data;
    },
    enabled: !!params.roomId,
  });

  const { data: rack } = useQuery({
    queryKey: ['rack', params.rackId],
    queryFn: async () => {
      if (!params.rackId) return null;
      const { data } = await supabase
        .from('racks')
        .select('name')
        .eq('id', params.rackId)
        .single();
      return data;
    },
    enabled: !!params.rackId,
  });

  const getBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ label: 'Home', path: '/dashboard' }];

    if (pathSegments[0] === 'dashboard') {
      breadcrumbs.push({ label: 'Dashboard', path: '/dashboard' });
    }

    if (pathSegments[0] === 'buildings') {
      breadcrumbs.push({ label: 'Localizações', path: '/buildings' });
      
      if (params.buildingId) {
        breadcrumbs.push({ 
          label: building?.name || 'Prédio', 
          path: `/buildings/${params.buildingId}/floors` 
        });
      }

      if (pathSegments.includes('floors') && params.floorId) {
        breadcrumbs.push({ 
          label: floor?.name || 'Andar', 
          path: `/buildings/${params.buildingId}/floors/${params.floorId}/rooms` 
        });
      }

      if (pathSegments.includes('rooms') && params.roomId) {
        breadcrumbs.push({ 
          label: room?.name || 'Sala', 
          path: `/buildings/${params.buildingId}/floors/${params.floorId}/rooms/${params.roomId}/racks` 
        });
      }

      if (pathSegments.includes('racks') && !params.rackId) {
        breadcrumbs.push({ label: 'Racks', path: location.pathname });
      }
    }

    if (pathSegments[0] === 'racks') {
      if (params.rackId) {
        breadcrumbs.push({ label: 'Racks', path: '/racks' });
        breadcrumbs.push({ label: rack?.name || 'Rack', path: `/racks/${params.rackId}` });
      } else {
        breadcrumbs.push({ label: 'Racks', path: '/racks' });
      }
    }

    if (pathSegments[0] === 'equipment' && params.id) {
      breadcrumbs.push({ label: 'Equipamentos', path: '/equipment' });
      breadcrumbs.push({ label: 'Detalhes', path: location.pathname });
    }

    if (pathSegments[0] === 'connections' && params.id) {
      breadcrumbs.push({ label: 'Conexões', path: '/connections' });
      breadcrumbs.push({ label: 'Detalhes', path: location.pathname });
    }

    if (pathSegments[0] === 'labels') {
      breadcrumbs.push({ label: 'Etiquetas', path: '/labels' });
    }

    if (pathSegments[0] === 'users') {
      breadcrumbs.push({ label: 'Usuários', path: '/users' });
    }

    if (pathSegments[0] === 'rack-occupancy') {
      breadcrumbs.push({ label: 'Relatório de Ocupação', path: '/rack-occupancy' });
    }

    if (pathSegments[0] === 'alerts') {
      breadcrumbs.push({ label: 'Alertas', path: '/alerts' });
    }

    if (pathSegments[0] === 'alert-settings') {
      breadcrumbs.push({ label: 'Configurações de Alertas', path: '/alert-settings' });
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <nav className="flex items-center gap-2 text-sm">
      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.path} className="flex items-center gap-2">
          {index === 0 && <Home className="h-4 w-4 text-muted-foreground" />}
          {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          {index === breadcrumbs.length - 1 ? (
            <span className="font-medium text-foreground">{crumb.label}</span>
          ) : (
            <Link to={crumb.path} className="text-muted-foreground hover:text-foreground transition-colors">
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
};
