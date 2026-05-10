import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ANALYSIS_TOOL = {
  type: "function",
  function: {
    name: "submit_analysis",
    description: "Retorna a análise estruturada do alerta Zabbix.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        summary: { type: "string", description: "Resumo do problema em 1-2 frases" },
        translation: { type: "string", description: "Tradução do alerta para PT-BR" },
        category: {
          type: "string",
          enum: ["linux", "rede", "mikrotik", "camera", "banco_dados", "docker", "vmware", "windows", "outro"],
        },
        priority: { type: "string", enum: ["baixa", "media", "alta", "critica"] },
        causes: { type: "array", items: { type: "string" }, description: "Possíveis causas" },
        commands: { type: "array", items: { type: "string" }, description: "Comandos de diagnóstico" },
        checklist: { type: "array", items: { type: "string" }, description: "Checklist de verificação" },
        recommendations: { type: "array", items: { type: "string" }, description: "Ações preventivas recomendadas" },
        whatsapp_message: { type: "string", description: "Mensagem pronta formatada para WhatsApp com emojis" },
      },
      required: [
        "summary", "translation", "category", "priority",
        "causes", "commands", "checklist", "recommendations", "whatsapp_message",
      ],
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json();
    const { alert_id, host, trigger_name, severity, last_value, message, payload } = body ?? {};

    // Carregar configurações
    const { data: settings } = await supabase
      .from("ai_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (!settings || settings.enabled === false) {
      return new Response(JSON.stringify({ error: "IA desabilitada nas configurações." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Se vier alert_id, buscar dados
    let alert: any = null;
    if (alert_id) {
      const { data } = await supabase.from("alerts").select("*").eq("id", alert_id).maybeSingle();
      alert = data;
    }

    const ctxHost = host ?? alert?.metadata?.host ?? alert?.metadata?.hostname ?? "desconhecido";
    const ctxTrigger = trigger_name ?? alert?.title ?? "alerta";
    const ctxSeverity = severity ?? alert?.severity ?? "warning";
    const ctxValue = last_value ?? alert?.metadata?.last_value ?? alert?.current_value ?? "";
    const ctxMessage = message ?? alert?.message ?? "";

    const userPrompt = `Analise o seguinte alerta Zabbix:

Host: ${ctxHost}
Trigger: ${ctxTrigger}
Severidade: ${ctxSeverity}
Último valor: ${ctxValue}
Mensagem: ${ctxMessage}

Payload completo: ${JSON.stringify(payload ?? alert?.metadata ?? {}, null, 2)}

Responda obrigatoriamente chamando a função submit_analysis.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: settings.model || "google/gemini-2.5-flash",
        temperature: Number(settings.temperature ?? 0.3),
        max_tokens: Number(settings.max_tokens ?? 2048),
        messages: [
          { role: "system", content: settings.prompt_template || "Você é um especialista em infraestrutura." },
          { role: "user", content: userPrompt },
        ],
        tools: [ANALYSIS_TOOL],
        tool_choice: { type: "function", function: { name: "submit_analysis" } },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições da IA atingido. Tente novamente mais tarde." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos da IA esgotados. Adicione créditos no workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `Falha na IA: ${errText}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "Resposta inválida da IA.", raw: aiData }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const usage = aiData.usage ?? {};

    // Persistir
    const { data: inserted, error: insErr } = await supabase
      .from("zabbix_ai_analysis")
      .insert({
        alert_id: alert_id ?? null,
        host: ctxHost,
        trigger_name: ctxTrigger,
        severity: String(ctxSeverity),
        category: parsed.category,
        priority: parsed.priority,
        original_alert: payload ?? alert?.metadata ?? body,
        summary: parsed.summary,
        translation: parsed.translation,
        causes: parsed.causes,
        commands: parsed.commands,
        checklist: parsed.checklist,
        recommendations: parsed.recommendations,
        whatsapp_message: parsed.whatsapp_message,
        model_used: settings.model,
        tokens_used: usage.total_tokens ?? null,
      })
      .select()
      .single();

    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message, analysis: parsed }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, analysis: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-zabbix-alert error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
