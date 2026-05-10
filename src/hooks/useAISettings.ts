import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface AISettings {
  id: string;
  model: string;
  temperature: number;
  max_tokens: number;
  prompt_template: string;
  enabled: boolean;
  auto_analyze: boolean;
  updated_at: string;
}

export const useAISettings = () => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["ai_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_settings")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as AISettings | null;
    },
  });

  const update = useMutation({
    mutationFn: async (patch: Partial<AISettings>) => {
      if (!query.data?.id) throw new Error("Configuração não inicializada");
      const { error } = await supabase
        .from("ai_settings")
        .update(patch)
        .eq("id", query.data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai_settings"] });
      toast({ title: "Configurações salvas" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return { ...query, update };
};
