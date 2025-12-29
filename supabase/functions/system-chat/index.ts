import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, sessionId } = await req.json();
    
    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch knowledge base
    const { data: knowledge } = await supabase
      .from('system_knowledge')
      .select('category, topic, content, keywords')
      .order('category');

    // Fetch real-time system stats
    const [
      { count: alertCount },
      { count: ticketCount },
      { count: equipmentCount },
      { count: connectionCount },
      { data: activeAlerts },
      { data: openTickets }
    ] = await Promise.all([
      supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('support_tickets').select('*', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
      supabase.from('equipment').select('*', { count: 'exact', head: true }),
      supabase.from('connections').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('alerts').select('title, severity, type, created_at').eq('status', 'active').limit(5),
      supabase.from('support_tickets').select('ticket_number, title, priority, status, created_at').in('status', ['open', 'in_progress']).limit(5)
    ]);

    // Build knowledge context
    const knowledgeContext = knowledge?.map(k => 
      `[${k.category.toUpperCase()}] ${k.topic}: ${k.content}`
    ).join('\n\n') || '';

    // Build real-time context
    const realTimeContext = `
ESTATÍSTICAS EM TEMPO REAL DO SISTEMA:
- Alertas ativos: ${alertCount || 0}
- Chamados abertos/em andamento: ${ticketCount || 0}
- Total de equipamentos: ${equipmentCount || 0}
- Conexões ativas: ${connectionCount || 0}

${activeAlerts && activeAlerts.length > 0 ? `ALERTAS ATIVOS:
${activeAlerts.map(a => `- [${a.severity.toUpperCase()}] ${a.title} (tipo: ${a.type})`).join('\n')}` : 'Nenhum alerta ativo no momento.'}

${openTickets && openTickets.length > 0 ? `CHAMADOS ABERTOS:
${openTickets.map(t => `- ${t.ticket_number}: ${t.title} (${t.priority}, ${t.status})`).join('\n')}` : 'Nenhum chamado aberto no momento.'}
`;

    const systemPrompt = `Você é o Assistente do Sistema de Gerenciamento de Datacenter. Você conhece profundamente todas as funcionalidades do sistema e pode ajudar os usuários com qualquer dúvida.

BASE DE CONHECIMENTO DO SISTEMA:
${knowledgeContext}

${realTimeContext}

INSTRUÇÕES:
1. Responda em português brasileiro de forma clara e objetiva
2. Use as informações da base de conhecimento para responder perguntas sobre funcionalidades
3. Use os dados em tempo real para responder sobre o estado atual do sistema
4. Se não souber algo específico, diga que não tem essa informação e sugira verificar na documentação ou com um administrador
5. Seja amigável e profissional
6. Use formatação Markdown quando apropriado (listas, negrito, código)
7. Para instruções passo a passo, use listas numeradas
8. Quando mencionar páginas/menus, indique o caminho de navegação (ex: "Configurações → Alertas")`;

    // Call Lovable AI
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Contate o administrador." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro no serviço de IA" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const assistantMessage = aiResponse.choices?.[0]?.message?.content || "Desculpe, não consegui processar sua pergunta.";

    console.log(`Chat processed: "${message.substring(0, 50)}..." -> Response length: ${assistantMessage.length}`);

    return new Response(
      JSON.stringify({ 
        response: assistantMessage,
        sessionId 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("System chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
