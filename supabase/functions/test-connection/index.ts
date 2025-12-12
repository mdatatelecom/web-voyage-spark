import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { host, port } = await req.json();
    
    if (!host) {
      return new Response(
        JSON.stringify({ success: false, error: 'Host is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const startTime = Date.now();
    
    // Try HTTP/HTTPS connection test
    const testUrl = port === 443 || port === 8443 
      ? `https://${host}:${port || 443}`
      : `http://${host}:${port || 80}`;
    
    console.log(`Testing connection to: ${testUrl}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    try {
      const response = await fetch(testUrl, {
        method: 'HEAD',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;
      
      return new Response(
        JSON.stringify({
          success: true,
          reachable: true,
          latency,
          status: response.status,
          message: `Host ${host} is reachable (${latency}ms)`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (fetchError) {
      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;
      
      // Try DNS resolution as fallback
      try {
        const dnsCheck = await fetch(`https://dns.google/resolve?name=${host}&type=A`);
        const dnsResult = await dnsCheck.json();
        
        if (dnsResult.Answer && dnsResult.Answer.length > 0) {
          return new Response(
            JSON.stringify({
              success: true,
              reachable: false,
              dnsResolved: true,
              ip: dnsResult.Answer[0].data,
              latency,
              message: `DNS resolved to ${dnsResult.Answer[0].data}, but port ${port || 80} is not responding`
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (dnsError) {
        console.log('DNS check failed:', dnsError);
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          reachable: false,
          dnsResolved: false,
          latency,
          message: `Host ${host} is not reachable or DNS failed`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error testing connection:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
