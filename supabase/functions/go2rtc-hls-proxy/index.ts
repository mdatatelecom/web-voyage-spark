import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const serverUrl = url.searchParams.get('server');
    const streamName = url.searchParams.get('stream');
    const segment = url.searchParams.get('segment');

    console.log(`go2rtc-hls-proxy: server=${serverUrl}, stream=${streamName}, segment=${segment}`);

    if (!serverUrl) {
      return new Response(
        JSON.stringify({ error: "server parameter is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Proxy for .ts segments
    if (segment) {
      console.log(`go2rtc-hls-proxy: Fetching segment ${segment}`);
      const segmentUrl = `${serverUrl}/api/${segment}`;
      
      const response = await fetch(segmentUrl, {
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        console.error(`go2rtc-hls-proxy: Segment fetch failed with status ${response.status}`);
        return new Response(
          JSON.stringify({ error: `Failed to fetch segment: ${response.status}` }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const body = await response.arrayBuffer();
      console.log(`go2rtc-hls-proxy: Segment fetched, size: ${body.byteLength} bytes`);
      
      return new Response(body, {
        headers: { 
          ...corsHeaders, 
          "Content-Type": "video/mp2t",
          "Cache-Control": "no-cache"
        }
      });
    }

    // Proxy for m3u8 playlist
    if (!streamName) {
      return new Response(
        JSON.stringify({ error: "stream parameter is required for m3u8" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const m3u8Url = `${serverUrl}/api/stream.m3u8?src=${encodeURIComponent(streamName)}`;
    console.log(`go2rtc-hls-proxy: Fetching m3u8 from ${m3u8Url}`);
    
    const response = await fetch(m3u8Url, {
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      console.error(`go2rtc-hls-proxy: m3u8 fetch failed with status ${response.status}`);
      return new Response(
        JSON.stringify({ error: `Failed to fetch m3u8: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let m3u8Content = await response.text();
    console.log(`go2rtc-hls-proxy: m3u8 content length: ${m3u8Content.length}`);

    // Get the base URL for this proxy function
    const proxyBaseUrl = `${url.origin}${url.pathname}`;
    
    // Rewrite segment URLs to use this proxy
    // go2rtc typically uses relative URLs like "segment0.ts" or absolute paths
    m3u8Content = m3u8Content.replace(
      /^([^#\n][^\n]*\.ts.*)$/gm,
      (match) => {
        // Handle both relative and absolute segment URLs
        const segmentName = match.trim();
        return `${proxyBaseUrl}?server=${encodeURIComponent(serverUrl)}&segment=${encodeURIComponent(segmentName)}`;
      }
    );

    console.log(`go2rtc-hls-proxy: Returning rewritten m3u8`);
    
    return new Response(m3u8Content, {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "no-cache"
      }
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to proxy HLS content";
    console.error("go2rtc-hls-proxy error:", errorMessage);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
