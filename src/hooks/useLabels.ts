import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useLabels = () => {
  const queryClient = useQueryClient();

  const { data: labels, isLoading } = useQuery({
    queryKey: ['labels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('labels')
        .select(`
          *,
          connection:connections(
            connection_code,
            cable_type,
            cable_color,
            cable_length_meters
          )
        `)
        .order('generated_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const createLabelMutation = useMutation({
    mutationFn: async ({ connectionId, qrCodeData }: { connectionId: string; qrCodeData: string }) => {
      const { data: label, error: labelError } = await supabase
        .from('labels')
        .insert({
          connection_id: connectionId,
          qr_code_data: qrCodeData,
          generated_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (labelError) throw labelError;

      // Log the action
      await supabase.from('access_logs').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'label_generated',
        connection_id: connectionId,
        details: { label_id: label.id },
      });

      return label;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] });
      toast.success('Etiqueta gerada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao gerar etiqueta: ${error.message}`);
    },
  });

  const markPrintedMutation = useMutation({
    mutationFn: async (labelId: string) => {
      const { data: currentLabel } = await supabase
        .from('labels')
        .select('print_count, connection_id')
        .eq('id', labelId)
        .single();

      const { error } = await supabase
        .from('labels')
        .update({
          printed_at: new Date().toISOString(),
          print_count: (currentLabel?.print_count || 0) + 1,
        })
        .eq('id', labelId);

      if (error) throw error;

      // Log the action
      await supabase.from('access_logs').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'label_printed',
        connection_id: currentLabel?.connection_id,
        details: { label_id: labelId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] });
      toast.success('Etiqueta marcada como impressa!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao marcar impressão: ${error.message}`);
    },
  });

  const deleteLabelMutation = useMutation({
    mutationFn: async (labelId: string) => {
      const { error } = await supabase
        .from('labels')
        .delete()
        .eq('id', labelId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] });
      toast.success('Etiqueta excluída!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });

  return {
    labels,
    isLoading,
    createLabel: createLabelMutation.mutate,
    markPrinted: markPrintedMutation.mutate,
    deleteLabel: deleteLabelMutation.mutate,
    isCreating: createLabelMutation.isPending,
  };
};
