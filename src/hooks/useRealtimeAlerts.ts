import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

export const useRealtimeAlerts = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('alerts-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
        },
        (payload) => {
          console.log('🔔 New alert received:', payload);
          
          const newAlert = payload.new as any;
          
          // Invalidate queries to refresh the data
          queryClient.invalidateQueries({ queryKey: ['alerts'] });
          queryClient.invalidateQueries({ queryKey: ['alerts-active-count'] });
          
          // Show toast notification
          const severityIcons = {
            info: Info,
            warning: AlertTriangle,
            critical: AlertCircle,
          };
          
          const IconComponent = severityIcons[newAlert.severity as keyof typeof severityIcons] || Info;
          
          toast(newAlert.title, {
            description: newAlert.message,
            duration: 5000,
            action: {
              label: 'Ver',
              onClick: () => {
                if (newAlert.related_entity_type === 'rack') {
                  window.location.href = `/racks/${newAlert.related_entity_id}`;
                } else if (newAlert.related_entity_type === 'equipment') {
                  window.location.href = `/equipment/${newAlert.related_entity_id}`;
                } else {
                  window.location.href = '/alerts';
                }
              },
            },
          });
          
          // Optional: Play sound based on severity
          if (newAlert.severity === 'critical') {
            // You can add sound here if needed
            console.log('🔴 Critical alert received!');
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      console.log('Unsubscribing from realtime alerts');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};
