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
    
    // Check for SSL certificate errors
    if (errorMessage.includes("UnknownIssuer") || 
        errorMessage.includes("certificate") || 
        errorMessage.includes("SSL") ||
        errorMessage.includes("TLS")) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Erro de certificado SSL: O servidor go2rtc usa um certificado não confiável. Use HTTP ao invés de HTTPS, ou configure um certificado válido.",
          errorType: "SSL_CERTIFICATE_ERROR"
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Check for connection refused errors
    if (errorMessage.includes("Connection refused") || 
        errorMessage.includes("connection refused") ||
        errorMessage.includes("os error 111")) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Conexão recusada: O servidor go2rtc não está respondendo. Verifique se: 1) O serviço go2rtc está rodando, 2) A porta está aberta no firewall, 3) O go2rtc está escutando em 0.0.0.0 (não apenas localhost).",
          errorType: "CONNECTION_REFUSED"
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Check for timeout errors
    if (errorMessage.includes("timeout") || errorMessage.includes("Timeout")) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Timeout: O servidor go2rtc não respondeu a tempo. Verifique se o servidor está acessível e não está sobrecarregado.",
          errorType: "TIMEOUT"
        }),
        { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Check for DNS errors
    if (errorMessage.includes("dns error") || errorMessage.includes("DNS") || errorMessage.includes("lookup")) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Erro de DNS: Não foi possível resolver o endereço do servidor. Verifique se o hostname está correto.",
          errorType: "DNS_ERROR"
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
