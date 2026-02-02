import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const serverUrl = url.searchParams.get('server');
    const streamName = url.searchParams.get('stream');

    if (!serverUrl || !streamName) {
      return new Response(
        JSON.stringify({ error: "server and stream parameters are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`go2rtc-snapshot-proxy: Fetching snapshot for stream ${streamName} from ${serverUrl}`);

    // Try to get snapshot from go2rtc
    const snapshotUrl = `${serverUrl}/api/frame.jpeg?src=${encodeURIComponent(streamName)}`;
    
    const response = await fetch(snapshotUrl, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.error(`go2rtc-snapshot-proxy: Failed with status ${response.status}`);
      return new Response(
        JSON.stringify({ error: `Failed to fetch snapshot: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get image as array buffer and convert to base64
    const imageBuffer = await response.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
    
    console.log(`go2rtc-snapshot-proxy: Got snapshot, size: ${imageBuffer.byteLength} bytes`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        image: `data:image/jpeg;base64,${base64}` 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch snapshot";
    console.error("go2rtc-snapshot-proxy error:", errorMessage);
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
