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

// Extract connection code from barcode text
export function extractConnectionCode(text: string): string | null {
  const cleaned = text.trim().toUpperCase();
  
  // Match CON-XXXX format
  const conMatch = cleaned.match(/^CON-[A-Z0-9]+$/);
  if (conMatch) {
    return conMatch[0];
  }
  
  // Match any alphanumeric code that could be a connection code (e.g., CON-A1B2C3)
  const genericMatch = cleaned.match(/^[A-Z]{2,4}-[A-Z0-9]{4,10}$/);
  if (genericMatch) {
    return genericMatch[0];
  }
  
  return null;
}

// Parse connection code from barcode and fetch connection info
export async function parseConnectionCode(text: string): Promise<QRCodeData | null> {
  const connectionCode = extractConnectionCode(text);
  
  if (!connectionCode) {
    return null;
  }
  
  try {
    const { data: connection, error } = await supabase
      .from('v_connection_details')
      .select('id, connection_code, equipment_a_name, port_a_name, equipment_b_name, port_b_name')
      .eq('connection_code', connectionCode)
      .maybeSingle();
    
    if (error || !connection) {
      return null;
    }
    
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
  } catch {
    return null;
  }
}
