import { useState } from 'react';
import { toast } from '@/hooks/use-toast';

interface ViaCEPResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

interface AddressData {
  address: string;
  city: string;
  state: string;
}

export function useViaCEP() {
  const [isLoading, setIsLoading] = useState(false);

  const fetchAddress = async (cep: string): Promise<AddressData | null> => {
    // Remove non-numeric characters
    const cleanCep = cep.replace(/\D/g, '');

    if (cleanCep.length !== 8) {
      return null;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar CEP');
      }

      const data: ViaCEPResponse = await response.json();

      if (data.erro) {
        toast({
          title: 'CEP não encontrado',
          description: 'O CEP informado não foi encontrado na base dos Correios.',
          variant: 'destructive',
        });
        return null;
      }

      // Combine logradouro and bairro for the address field
      const addressParts = [data.logradouro, data.bairro].filter(Boolean);
      const address = addressParts.join(', ');

      return {
        address,
        city: data.localidade,
        state: data.uf,
      };
    } catch (error) {
      console.error('Error fetching CEP:', error);
      toast({
        title: 'Erro ao buscar CEP',
        description: 'Não foi possível buscar o endereço. Tente novamente.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    fetchAddress,
    isLoading,
  };
}
