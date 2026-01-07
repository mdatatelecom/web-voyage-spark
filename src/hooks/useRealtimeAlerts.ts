import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

// Send WhatsApp alert for critical/warning alerts
const sendWhatsAppAlert = async (alert: any) => {
  try {
    const { data: settings } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'whatsapp_settings')
      .single();
    
    if (!settings?.setting_value) return;
    
    const whatsappSettings = settings.setting_value as any;
    if (!whatsappSettings.isEnabled) return;
    
    const icon = alert.severity === 'critical' ? '🚨' : '⚠️';
    const message = `${icon} *ALERTA ${alert.severity.toUpperCase()}*\n\n*${alert.title}*\n\n${alert.message}`;
    
    const body = whatsappSettings.targetType === 'group' 
      ? { action: 'send-group', groupId: whatsappSettings.selectedGroupId, message }
      : { action: 'send', phone: whatsappSettings.defaultPhone, message };
    
    await supabase.functions.invoke('send-whatsapp', { body });
    console.log('✅ WhatsApp alert sent successfully');
  } catch (error) {
    console.error('Failed to send WhatsApp alert:', error);
  }
};
// Play beep sound using Web Audio API
const playBeep = (frequency: number, duration: number, count: number) => {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  
  try {
    const ctx = new AudioContext();
    
    for (let i = 0; i < count; i++) {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      
      const startTime = ctx.currentTime + (i * (duration + 0.1));
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    }
  } catch (e) {
    console.log('Audio playback failed:', e);
  }
};

const playAlertSound = (severity: string) => {
  // Check if sounds are enabled in localStorage
  const soundEnabled = localStorage.getItem('alertSoundEnabled') !== 'false';
  if (!soundEnabled) return;
  
  if (severity === 'critical') {
    // 3 quick high beeps for critical
    playBeep(880, 0.15, 3);
  } else if (severity === 'warning') {
    // 1 moderate beep for warning
    playBeep(440, 0.3, 1);
  }
};

const sendPushNotification = (alert: any) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }
  
  const iconMap: Record<string, string> = {
    critical: '🔴',
    warning: '🟡',
    info: '🔵',
  };
  
  try {
    const notification = new Notification(`${iconMap[alert.severity] || ''} ${alert.title}`, {
      body: alert.message,
      icon: '/favicon.ico',
      tag: alert.id, // Prevents duplicates
      requireInteraction: alert.severity === 'critical', // Critical alerts don't auto-dismiss
    });
    
    notification.onclick = () => {
      window.focus();
      if (alert.related_entity_type === 'rack') {
        window.location.href = `/racks/${alert.related_entity_id}`;
      } else if (alert.related_entity_type === 'equipment') {
        window.location.href = `/equipment/${alert.related_entity_id}`;
      } else {
        window.location.href = '/alerts';
      }
      notification.close();
    };
  } catch (e) {
    console.log('Push notification failed:', e);
  }
};

export const useRealtimeAlerts = () => {
  const queryClient = useQueryClient();
  const hasRequestedPermission = useRef(false);

  // Request notification permission on mount
  useEffect(() => {
    if (!hasRequestedPermission.current && 'Notification' in window && Notification.permission === 'default') {
      hasRequestedPermission.current = true;
      Notification.requestPermission().then((permission) => {
        console.log('Notification permission:', permission);
      });
    }
  }, []);

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
          
          // Play sound for critical and warning alerts
          playAlertSound(newAlert.severity);
          
          // Send push notification and WhatsApp for critical and warning alerts
          if (newAlert.severity === 'critical' || newAlert.severity === 'warning') {
            sendPushNotification(newAlert);
            sendWhatsAppAlert(newAlert);
          }
          
          // Show toast notification
          const severityIcons = {
            info: Info,
            warning: AlertTriangle,
            critical: AlertCircle,
          };
          
          const IconComponent = severityIcons[newAlert.severity as keyof typeof severityIcons] || Info;
          
          toast(newAlert.title, {
            description: newAlert.message,
            duration: newAlert.severity === 'critical' ? 10000 : 5000,
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
          
          if (newAlert.severity === 'critical') {
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
