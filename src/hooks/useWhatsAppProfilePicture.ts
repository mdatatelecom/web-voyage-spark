import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FetchProfilePictureResult {
  success: boolean;
  profilePictureUrl: string | null;
  message?: string;
}

export function useWhatsAppProfilePicture() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

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

  const fetchAndUpdateProfilePicture = async (userId: string, phone: string): Promise<string | null> => {
    if (!userId || !phone) {
      console.log('Missing userId or phone for profile picture update');
      return null;
    }

    setIsLoading(true);

    try {
      // Fetch profile picture from WhatsApp
      const profilePictureUrl = await fetchProfilePicture(phone);

      if (profilePictureUrl) {
        // Update the user's profile with the WhatsApp avatar
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: profilePictureUrl })
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
    isLoading,
  };
}
