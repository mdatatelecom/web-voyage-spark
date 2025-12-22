import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FetchProfilePictureResult {
  success: boolean;
  profilePictureUrl: string | null;
  message?: string;
}

const CACHE_HOURS = 24;

export function useWhatsAppProfilePicture() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const shouldFetchPhoto = async (userId: string): Promise<boolean> => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url, avatar_updated_at')
        .eq('id', userId)
        .maybeSingle();

      // Se não tem foto, deve buscar
      if (!profile?.avatar_url) return true;

      // Se foto foi atualizada há menos de CACHE_HOURS, não buscar
      if (profile.avatar_updated_at) {
        const lastUpdate = new Date(profile.avatar_updated_at);
        const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);
        if (hoursSinceUpdate < CACHE_HOURS) {
          console.log(`Avatar em cache (atualizado há ${hoursSinceUpdate.toFixed(1)}h)`);
          return false;
        }
      }

      return true;
    } catch (err) {
      console.error('Erro ao verificar cache de foto:', err);
      return true; // Em caso de erro, tentar buscar
    }
  };

  const fetchProfilePicture = async (phone: string): Promise<string | null> => {
    if (!phone) {
      console.log('No phone number provided for profile picture fetch');
      return null;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          action: 'fetch-profile-picture',
          phone,
        },
      });

      if (error) {
        console.error('Error fetching profile picture:', error);
        return null;
      }

      const result = data as FetchProfilePictureResult;
      
      if (result?.success && result?.profilePictureUrl) {
        console.log('Profile picture fetched successfully:', result.profilePictureUrl);
        return result.profilePictureUrl;
      }

      console.log('No profile picture available');
      return null;
    } catch (err) {
      console.error('Error fetching WhatsApp profile picture:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAndUpdateProfilePicture = async (
    userId: string, 
    phone: string, 
    force: boolean = false
  ): Promise<string | null> => {
    if (!userId || !phone) {
      console.log('Missing userId or phone for profile picture update');
      return null;
    }

    // Verificar cache (a menos que force = true)
    if (!force) {
      const shouldFetch = await shouldFetchPhoto(userId);
      if (!shouldFetch) {
        toast({
          title: 'Foto em cache',
          description: 'A foto foi atualizada recentemente. Use forçar atualização se necessário.',
          variant: 'default',
        });
        return null;
      }
    }

    setIsLoading(true);

    try {
      // Fetch profile picture from WhatsApp
      const profilePictureUrl = await fetchProfilePicture(phone);

      if (profilePictureUrl) {
        // Update the user's profile with the WhatsApp avatar and timestamp
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            avatar_url: profilePictureUrl,
            avatar_updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (updateError) {
          console.error('Error updating profile avatar:', updateError);
          toast({
            title: 'Erro ao atualizar avatar',
            description: 'Não foi possível salvar a foto do WhatsApp.',
            variant: 'destructive',
          });
          return null;
        }

        toast({
          title: 'Avatar atualizado',
          description: 'A foto do WhatsApp foi salva com sucesso.',
        });

        return profilePictureUrl;
      }

      toast({
        title: 'Foto não disponível',
        description: 'Não foi possível obter a foto do WhatsApp. O usuário pode ter privacidade ativada.',
        variant: 'default',
      });

      return null;
    } catch (err) {
      console.error('Error fetching and updating profile picture:', err);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao buscar a foto do WhatsApp.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    fetchProfilePicture,
    fetchAndUpdateProfilePicture,
    shouldFetchPhoto,
    isLoading,
  };
}
