import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface AIAnalysis {
  id: string;
  alert_id: string | null;
  host: string | null;
  trigger_name: string | null;
  severity: string | null;
  category: string | null;
  priority: string | null;
  original_alert: any;
  summary: string | null;
  translation: string | null;
  causes: string[] | null;
  commands: string[] | null;
  checklist: string[] | null;
  recommendations: string[] | null;
  whatsapp_message: string | null;
  model_used: string | null;
  tokens_used: number | null;
  created_at: string;
}

export const useAIAnalyses = (filters?: { host?: string; category?: string; severity?: string }) => {
  return useQuery({
    queryKey: ["ai_analyses", filters],
    queryFn: async () => {
      let q = supabase.from("zabbix_ai_analysis").select("*").order("created_at", { ascending: false }).limit(200);
      if (filters?.host) q = q.ilike("host", `%${filters.host}%`);
      if (filters?.category) q = q.eq("category", filters.category);
      if (filters?.severity) q = q.eq("severity", filters.severity);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AIAnalysis[];
    },
  });
};

export const useAIAnalysis = (id?: string) => {
  return useQuery({
    queryKey: ["ai_analysis", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("zabbix_ai_analysis").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data as AIAnalysis | null;
    },
  });
};

export const useAnalyzeAlert = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { alert_id?: string; host?: string; trigger_name?: string; severity?: string; last_value?: string; message?: string; payload?: any }) => {
      const { data, error } = await supabase.functions.invoke("analyze-zabbix-alert", { body: input });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return (data as any).analysis as AIAnalysis;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai_analyses"] });
      toast({ title: "Análise gerada com sucesso" });
    },
    onError: (e: Error) => toast({ title: "Falha na análise", description: e.message, variant: "destructive" }),
  });
};

export const useTestAIConnection = () => {
  return useMutation({
    mutationFn: async (model?: string) => {
      const { data, error } = await supabase.functions.invoke("test-ai-connection", { body: { model } });
      if (error) throw error;
      return data as { ok: boolean; error?: string; sample?: string };
    },
  });
};
