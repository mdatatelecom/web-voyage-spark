import { supabase } from '@/integrations/supabase/client';

export interface QRCodeData {
  code: string;
  id: string;
  a: { eq: string; p: string };
  b: { eq: string; p: string };
}

export function isValidQRCode(data: any): data is QRCodeData {
  return (
    data &&
    typeof data.code === 'string' &&
    typeof data.id === 'string' &&
    data.a?.eq && 
    data.a?.p &&
    data.b?.eq && 
    data.b?.p
  );
}

export function parseQRCode(text: string): QRCodeData | null {
  try {
    const data = JSON.parse(text);
    return isValidQRCode(data) ? data : null;
  } catch {
    return null;
  }
}

const UUID_ANYWHERE_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function isUuid(value: string) {
  return UUID_ANYWHERE_REGEX.test(value) && value.match(UUID_ANYWHERE_REGEX)?.[0] === value;
}

function tryExtractFromUrl(raw: string): string | null {
  try {
    const url = new URL(raw);

    // Common query params that might carry IDs/codes
    const candidates = [
      url.searchParams.get('id'),
      url.searchParams.get('connectionId'),
      url.searchParams.get('connection_id'),
      url.searchParams.get('code'),
      url.searchParams.get('connectionCode'),
      url.searchParams.get('connection_code'),
    ].filter(Boolean) as string[];

    // Also scan pathname/hash as fallback
    candidates.push(url.pathname);
    candidates.push(url.hash);

    for (const c of candidates) {
      const hit = extractConnectionCode(c);
      if (hit) return hit;
    }

    return null;
  } catch {
    return null;
  }
}

// Extract connection code from barcode text
export function extractConnectionCode(text: string): string | null {
  const raw = String(text ?? '').trim();
  if (!raw) return null;

  // If the QR contains a URL, try extracting from it first.
  const fromUrl = tryExtractFromUrl(raw);
  if (fromUrl) return fromUrl;

  // UUID anywhere (common when QR stores a direct /connections/:id URL)
  const uuidAnywhere = raw.match(UUID_ANYWHERE_REGEX);
  if (uuidAnywhere) return uuidAnywhere[0];

  const cleaned = raw.toUpperCase();
  
  // Prefer system prefixes; allow multiple segments (e.g., CON-0001-0002, CAB-12-34, C-00034)
  const prefixed = cleaned.match(/\b(?:CON|NET|CAB|FIB|LINK|C)[-_][A-Z0-9]+(?:[-_][A-Z0-9]+)*\b/);
  if (prefixed) return prefixed[0].replace(/_/g, '-');

  // Generic fallback: 1-8 letter prefix + alphanumeric suffix (e.g., C-00034, AB-123)
  const genericEmbedded = cleaned.match(/\b[A-Z]{1,8}[-_][A-Z0-9]{2,32}(?:[-_][A-Z0-9]{2,32})*\b/);
  if (genericEmbedded) return genericEmbedded[0].replace(/_/g, '-');
  
  return null;
}

// Parse connection code from barcode and fetch connection info
export async function parseConnectionCode(text: string): Promise<QRCodeData | null> {
  const connectionCode = extractConnectionCode(text);
  
  if (!connectionCode) {
    return null;
  }
  
  const baseQuery = supabase
    .from('v_connection_details')
    .select('id, connection_code, equipment_a_name, port_a_name, equipment_b_name, port_b_name');

  const query = isUuid(connectionCode)
    ? baseQuery.eq('id', connectionCode)
    : baseQuery.eq('connection_code', connectionCode);

  const { data: connection, error } = await query.maybeSingle();

  if (error) throw error;
  if (!connection) return null;

  return {
    code: connection.connection_code!,
    id: connection.id!,
    a: {
      eq: connection.equipment_a_name || '',
      p: connection.port_a_name || '',
    },
    b: {
      eq: connection.equipment_b_name || '',
      p: connection.port_b_name || '',
    },
  };
}
