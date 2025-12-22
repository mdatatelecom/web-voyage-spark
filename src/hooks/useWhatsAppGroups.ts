import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WhatsAppGroup {
  id: string;
  subject: string;
  size: number;
  creation: number;
  owner: string;
  desc: string;
  picture_url?: string;
}

export interface ListGroupsResult {
  groups: WhatsAppGroup[];
  needsReconnect?: boolean;
  message?: string;
}

export const useWhatsAppGroups = () => {
  const { toast } = useToast();
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Save groups to database for caching
  const saveGroupsToDatabase = async (groupList: WhatsAppGroup[]) => {
    try {
      for (const group of groupList) {
        await supabase
          .from('whatsapp_groups')
          .upsert({
            id: group.id,
            subject: group.subject,
            description: group.desc,
            owner: group.owner,
            size: group.size,
            picture_url: group.picture_url || null,
          }, { onConflict: 'id' });
      }
    } catch (error) {
      console.error('Error saving groups to database:', error);
    }
  };

  const listGroups = async (
    apiUrl: string,
    apiKey: string,
    instanceName: string
  ): Promise<ListGroupsResult> => {
    if (!apiUrl || !apiKey || !instanceName) {
      return { groups: [], needsReconnect: false };
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          action: 'list-groups',
          settings: {
            evolutionApiUrl: apiUrl,
            evolutionApiKey: apiKey,
            evolutionInstance: instanceName,
            isEnabled: true,
            defaultCountryCode: '55',
          },
        },
      });

      if (error) throw error;

      if (data?.success && Array.isArray(data.groups)) {
        setGroups(data.groups);
        // Save groups to database for future reference
        await saveGroupsToDatabase(data.groups);
        return { groups: data.groups, needsReconnect: false };
      } else {
        // Check if reconnection is needed
        const needsReconnect = data?.needsReconnect === true;
        
        if (!needsReconnect) {
          toast({
            title: 'Aviso',
            description: data?.message || 'Nenhum grupo encontrado',
            variant: 'destructive',
          });
        }
        
        setGroups([]);
        return { 
          groups: [], 
          needsReconnect,
          message: data?.message 
        };
      }
    } catch (error) {
      console.error('Erro ao listar grupos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível listar os grupos',
        variant: 'destructive',
      });
      return { groups: [], needsReconnect: false };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    groups,
    isLoading,
    listGroups,
  };
};
