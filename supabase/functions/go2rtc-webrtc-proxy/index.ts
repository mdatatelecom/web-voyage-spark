import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { serverUrl, streamName, sdpOffer } = await req.json();

    if (!serverUrl || !streamName || !sdpOffer) {
      console.error("Missing parameters:", { serverUrl: !!serverUrl, streamName: !!streamName, sdpOffer: !!sdpOffer });
      return new Response(
        JSON.stringify({ success: false, error: "Missing required parameters: serverUrl, streamName, sdpOffer" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`WebRTC SDP exchange for stream: ${streamName} on server: ${serverUrl}`);

    // POST SDP offer to go2rtc WebRTC endpoint
    const webrtcUrl = `${serverUrl}/api/webrtc?src=${encodeURIComponent(streamName)}`;
    console.log(`Sending SDP offer to: ${webrtcUrl}`);

    const response = await fetch(webrtcUrl, {
      method: "POST",
      headers: { 
        "Content-Type": "application/sdp",
      },
      body: sdpOffer,
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`go2rtc WebRTC error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `go2rtc returned ${response.status}: ${errorText}` 
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sdpAnswer = await response.text();
    console.log(`Received SDP answer (${sdpAnswer.length} bytes)`);

    return new Response(
      JSON.stringify({ success: true, sdpAnswer }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("WebRTC proxy error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
