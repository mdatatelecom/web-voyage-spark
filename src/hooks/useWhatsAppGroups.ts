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
  const [isFetchingPictures, setIsFetchingPictures] = useState(false);

  // Fetch picture for a single group
  const fetchGroupPicture = async (
    groupId: string,
    apiUrl: string,
    apiKey: string,
    instanceName: string
  ): Promise<string | null> => {
    try {
      const { data } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          action: 'fetch-group-picture',
          groupId,
          settings: {
            evolutionApiUrl: apiUrl,
            evolutionApiKey: apiKey,
            evolutionInstance: instanceName,
            isEnabled: true,
            defaultCountryCode: '55',
          },
        },
      });
      return data?.pictureUrl || null;
    } catch (error) {
      console.error(`Error fetching picture for group ${groupId}:`, error);
      return null;
    }
  };

  // Fetch pictures for all groups (in batches to avoid rate limiting)
  const fetchGroupPictures = async (
    groupList: WhatsAppGroup[],
    apiUrl: string,
    apiKey: string,
    instanceName: string
  ): Promise<WhatsAppGroup[]> => {
    setIsFetchingPictures(true);
    const updatedGroups: WhatsAppGroup[] = [];
    
    // Process groups in batches of 3 to avoid rate limiting
    const batchSize = 3;
    for (let i = 0; i < groupList.length; i += batchSize) {
      const batch = groupList.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (group) => {
          const pictureUrl = await fetchGroupPicture(group.id, apiUrl, apiKey, instanceName);
          return { ...group, picture_url: pictureUrl || group.picture_url };
        })
      );
      updatedGroups.push(...batchResults);
    }
    
    setIsFetchingPictures(false);
    return updatedGroups;
  };

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
    instanceName: string,
    fetchPictures: boolean = true
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
        let groupList = data.groups as WhatsAppGroup[];
        
        // Save groups to database for future reference
        await saveGroupsToDatabase(groupList);
        
        // Optionally fetch pictures for each group
        if (fetchPictures && groupList.length > 0) {
          // Fetch pictures in background, don't block the UI
          fetchGroupPictures(groupList, apiUrl, apiKey, instanceName).then(async (updatedGroups) => {
            setGroups(updatedGroups);
            await saveGroupsToDatabase(updatedGroups);
          });
        }
        
        setGroups(groupList);
        return { groups: groupList, needsReconnect: false };
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

  // Manually refresh pictures for all groups
  const refreshGroupPictures = async (
    apiUrl: string,
    apiKey: string,
    instanceName: string
  ) => {
    if (groups.length === 0) return;
    
    setIsFetchingPictures(true);
    try {
      const updatedGroups = await fetchGroupPictures(groups, apiUrl, apiKey, instanceName);
      setGroups(updatedGroups);
      await saveGroupsToDatabase(updatedGroups);
      toast({
        title: 'Fotos atualizadas',
        description: `Fotos de ${updatedGroups.length} grupos foram atualizadas.`,
      });
    } catch (error) {
      console.error('Error refreshing group pictures:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar as fotos dos grupos',
        variant: 'destructive',
      });
    } finally {
      setIsFetchingPictures(false);
    }
  };

  return {
    groups,
    isLoading,
    isFetchingPictures,
    listGroups,
    refreshGroupPictures,
    fetchGroupPicture,
  };
};
