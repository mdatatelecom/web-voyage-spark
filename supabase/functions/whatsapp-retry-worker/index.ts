import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_ATTEMPTS = 5;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Pull up to 20 due retries
  const { data: rows, error } = await supabase
    .from('whatsapp_notifications')
    .select('id, payload, attempts, message_type, phone_number, ticket_id')
    .eq('status', 'retrying')
    .lte('next_retry_at', new Date().toISOString())
    .limit(20);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const results: Array<{ id: string; ok: boolean }> = [];

  for (const row of rows || []) {
    const payload = (row.payload || {}) as any;
    const action = payload.action || (row.message_type?.includes('group') ? 'send-group' : 'send');

    // Mark as in-flight (pending) to avoid duplicate workers picking it up
    await supabase
      .from('whatsapp_notifications')
      .update({ status: 'pending', last_attempt_at: new Date().toISOString() })
      .eq('id', row.id);

    try {
      const body: any = { action, message: payload.message, ticketId: row.ticket_id, _retryId: row.id };
      if (action === 'send-group') body.groupId = payload.groupId;
      else body.phone = payload.phone || row.phone_number;

      const resp = await supabase.functions.invoke('send-whatsapp', { body });
      const ok = !resp.error && (resp.data as any)?.success === true;
      results.push({ id: row.id, ok });
    } catch (err: any) {
      const attempts = (row.attempts || 0) + 1;
      const failed = attempts >= MAX_ATTEMPTS;
      const backoffMs = Math.min(5 * 60 * 1000, 15000 * Math.pow(2, attempts - 1));
      await supabase
        .from('whatsapp_notifications')
        .update({
          status: failed ? 'failed' : 'retrying',
          attempts,
          next_retry_at: failed ? null : new Date(Date.now() + backoffMs).toISOString(),
          error_message: err?.message || 'Erro de rede',
        })
        .eq('id', row.id);
      results.push({ id: row.id, ok: false });
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
