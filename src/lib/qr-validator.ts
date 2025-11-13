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
