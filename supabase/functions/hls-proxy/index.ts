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
    const reqUrl = new URL(req.url);
    const targetUrl = reqUrl.searchParams.get('url');
    const isSegment = reqUrl.searchParams.get('segment') === 'true';

    console.log(`hls-proxy: url=${targetUrl}, isSegment=${isSegment}`);

    if (!targetUrl) {
      return new Response(
        JSON.stringify({ error: "url parameter is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid URL provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the content
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; HLS-Proxy/1.0)",
        "Accept": "*/*",
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      console.error(`hls-proxy: Fetch failed with status ${response.status}`);
      return new Response(
        JSON.stringify({ error: `Failed to fetch: ${response.status} ${response.statusText}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If this is a segment (.ts file), return binary content
    if (isSegment || targetUrl.includes('.ts')) {
      const body = await response.arrayBuffer();
      console.log(`hls-proxy: Segment fetched, size: ${body.byteLength} bytes`);
      
      return new Response(body, {
        headers: { 
          ...corsHeaders, 
          "Content-Type": "video/mp2t",
          "Cache-Control": "no-cache"
        }
      });
    }

    // For m3u8 manifest, rewrite URLs
    let content = await response.text();
    console.log(`hls-proxy: M3U8 content length: ${content.length}`);

    // Get base URL for relative path resolution
    const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
    
    // Get the proxy base URL
    const proxyBaseUrl = `${reqUrl.origin}${reqUrl.pathname}`;

    // Rewrite segment URLs to use this proxy
    const lines = content.split('\n');
    const rewrittenLines = lines.map(line => {
      const trimmedLine = line.trim();
      
      // Skip empty lines and comments (except EXT- tags which we keep as-is)
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        return line;
      }
      
      // This is a URL line (segment or sub-playlist)
      let absoluteUrl: string;
      
      if (trimmedLine.startsWith('http://') || trimmedLine.startsWith('https://')) {
        // Already absolute
        absoluteUrl = trimmedLine;
      } else if (trimmedLine.startsWith('/')) {
        // Absolute path, need to prepend origin
        absoluteUrl = `${parsedUrl.origin}${trimmedLine}`;
      } else {
        // Relative path
        absoluteUrl = baseUrl + trimmedLine;
      }
      
      // Determine if this is a segment or another m3u8
      const isSegmentUrl = trimmedLine.includes('.ts') || 
                           trimmedLine.includes('.aac') || 
                           trimmedLine.includes('.m4s');
      
      return `${proxyBaseUrl}?url=${encodeURIComponent(absoluteUrl)}${isSegmentUrl ? '&segment=true' : ''}`;
    });

    const rewrittenContent = rewrittenLines.join('\n');
    console.log(`hls-proxy: Returning rewritten M3U8`);

    return new Response(rewrittenContent, {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "no-cache"
      }
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to proxy HLS content";
    console.error("hls-proxy error:", errorMessage);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
