import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WhatsAppNotification {
  id: string;
  ticket_id: string | null;
  phone_number: string;
  message_content: string;
  message_type: string;
  status: string | null;
  error_message: string | null;
  external_id: string | null;
  sent_at: string | null;
  created_at: string | null;
  ticket?: {
    ticket_number: string;
    title: string;
  } | null;
  // Contact/Group info
  contact_name?: string | null;
  contact_avatar_url?: string | null;
  group_name?: string | null;
  group_picture_url?: string | null;
}

export interface WhatsAppHistoryFilters {
  startDate?: Date;
  endDate?: Date;
  status?: 'all' | 'sent' | 'error' | 'pending';
  phoneSearch?: string;
  ticketId?: string;
  messageType?: 'all' | 'notification' | 'test' | 'alert' | 'manual';
  page?: number;
  pageSize?: number;
}

// Cache constants
const CACHE_KEY = 'whatsapp_profile_pictures_cache';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry {
  url: string | null;
  timestamp: number;
}

// Helper to get cached picture
const getCachedPicture = (phoneNumber: string): string | null => {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    const entry: CacheEntry | undefined = cache[phoneNumber];
    if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
      return entry.url;
    }
  } catch {
    // Ignore cache errors
  }
  return null;
};

// Helper to set cached picture
const setCachedPicture = (phoneNumber: string, url: string | null) => {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    cache[phoneNumber] = { url, timestamp: Date.now() };
    
    // Limit cache size to 500 entries
    const keys = Object.keys(cache);
    if (keys.length > 500) {
      const sorted = keys
        .map(k => ({ key: k, ts: cache[k].timestamp }))
        .sort((a, b) => a.ts - b.ts);
      
      // Remove oldest 100 entries
      sorted.slice(0, 100).forEach(item => delete cache[item.key]);
    }
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore cache errors
  }
};

// Helper to normalize phone number for matching
const normalizePhone = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

export const useWhatsAppHistory = (filters: WhatsAppHistoryFilters = {}) => {
  const { startDate, endDate, status, phoneSearch, ticketId, messageType } = filters;
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 50;

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['whatsapp-history', startDate, endDate, status, phoneSearch, ticketId, messageType, page, pageSize],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('whatsapp_notifications')
        .select(`
          *,
          ticket:support_tickets!whatsapp_notifications_ticket_id_fkey (
            ticket_number,
            title
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      // Apply filters
      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }

      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endOfDay.toISOString());
      }

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      if (ticketId) {
        query = query.eq('ticket_id', ticketId);
      }

      if (messageType && messageType !== 'all') {
        query = query.eq('message_type', messageType);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const rawNotifications = data as WhatsAppNotification[];

      // Separate individual phones and groups
      const individualPhones = rawNotifications
        .filter(n => !n.phone_number.includes('@g.us'))
        .map(n => normalizePhone(n.phone_number));
      
      const groupIds = rawNotifications
        .filter(n => n.phone_number.includes('@g.us'))
        .map(n => n.phone_number);

      // Fetch profiles for individual contacts
      let profilesMap: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
      if (individualPhones.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('phone, full_name, avatar_url')
          .not('phone', 'is', null);
        
        if (profiles) {
          profiles.forEach(p => {
            if (p.phone) {
              profilesMap[normalizePhone(p.phone)] = {
                full_name: p.full_name,
                avatar_url: p.avatar_url,
              };
            }
          });
        }
      }

      // Fetch groups from cache
      let groupsMap: Record<string, { subject: string; picture_url: string | null }> = {};
      if (groupIds.length > 0) {
        const { data: groups } = await supabase
          .from('whatsapp_groups')
          .select('id, subject, picture_url')
          .in('id', groupIds);
        
        if (groups) {
          groups.forEach(g => {
            groupsMap[g.id] = {
              subject: g.subject,
              picture_url: g.picture_url,
            };
            // Cache group pictures
            if (g.picture_url) {
              setCachedPicture(g.id, g.picture_url);
            }
          });
        }
      }

      // Enrich notifications with contact/group info
      let enrichedNotifications = rawNotifications.map(n => {
        if (n.phone_number.includes('@g.us')) {
          const group = groupsMap[n.phone_number];
          // Try cache if not in database
          const cachedPicture = !group?.picture_url ? getCachedPicture(n.phone_number) : null;
          return {
            ...n,
            group_name: group?.subject || null,
            group_picture_url: group?.picture_url || cachedPicture || null,
          };
        } else {
          const normalizedPhone = normalizePhone(n.phone_number);
          const profile = profilesMap[normalizedPhone];
          // Try cache if not in profile
          const cachedPicture = !profile?.avatar_url ? getCachedPicture(normalizedPhone) : null;
          
          // If we have avatar from profile, cache it
          if (profile?.avatar_url) {
            setCachedPicture(normalizedPhone, profile.avatar_url);
          }
          
          return {
            ...n,
            contact_name: profile?.full_name || null,
            contact_avatar_url: profile?.avatar_url || cachedPicture || null,
          };
        }
      });

      // Apply name/phone search filter (local filtering for names)
      if (phoneSearch) {
        const searchTerm = phoneSearch.toLowerCase();
        enrichedNotifications = enrichedNotifications.filter(n => {
          // Search in phone number
          const phoneMatch = n.phone_number.toLowerCase().includes(searchTerm);
          // Search in contact name
          const contactNameMatch = n.contact_name?.toLowerCase().includes(searchTerm);
          // Search in group name
          const groupNameMatch = n.group_name?.toLowerCase().includes(searchTerm);
          
          return phoneMatch || contactNameMatch || groupNameMatch;
        });
      }

      return { notifications: enrichedNotifications, totalCount: count || 0 };
    },
  });

  const notifications = data?.notifications || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Get stats for the filtered period
  const stats = notifications ? {
    total: totalCount,
    sent: notifications.filter(n => n.status === 'sent').length,
    error: notifications.filter(n => n.status === 'error').length,
    pending: notifications.filter(n => n.status === 'pending').length,
  } : { total: 0, sent: 0, error: 0, pending: 0 };

  return {
    notifications,
    isLoading,
    error,
    refetch,
    stats,
    totalCount,
    totalPages,
    currentPage: page,
    pageSize,
  };
};

export const useResendWhatsApp = () => {
  const resend = async (notificationId: string) => {
    // Get the original notification
    const { data: notification, error: fetchError } = await supabase
      .from('whatsapp_notifications')
      .select('*')
      .eq('id', notificationId)
      .single();

    if (fetchError || !notification) {
      throw new Error('Notificação não encontrada');
    }

    // Call edge function to resend
    const { data, error } = await supabase.functions.invoke('send-whatsapp', {
      body: {
        action: 'send',
        phone: notification.phone_number,
        message: notification.message_content,
        ticketId: notification.ticket_id,
        resendFromId: notificationId,
      },
    });

    if (error) throw error;
    return data;
  };

  return { resend };
};