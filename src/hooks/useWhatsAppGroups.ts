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
