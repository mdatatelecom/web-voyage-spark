import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { serverUrl, endpoint, method = "GET" } = await req.json();
    
    console.log(`go2rtc-proxy: ${method} ${serverUrl}${endpoint}`);
    
    if (!serverUrl || !endpoint) {
      console.error("go2rtc-proxy: Missing serverUrl or endpoint");
      return new Response(
        JSON.stringify({ error: "serverUrl and endpoint are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetUrl = `${serverUrl}${endpoint}`;
    console.log(`go2rtc-proxy: Fetching ${targetUrl}`);
    
    const response = await fetch(targetUrl, {
      method,
      signal: AbortSignal.timeout(10000),
    });

    const data = await response.text();
    console.log(`go2rtc-proxy: Response status ${response.status}, data length: ${data.length}`);
    
    return new Response(
      JSON.stringify({ 
        success: response.ok, 
        status: response.status,
        data: data 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to connect to go2rtc server";
    console.error("go2rtc-proxy error:", errorMessage);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
