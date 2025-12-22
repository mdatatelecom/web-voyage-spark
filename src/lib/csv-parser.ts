// CSV Parser utility for camera imports
export interface CameraCSVRow {
  channel: number;
  nvrName: string;
  nvrIp: string;
  cameraIp: string;
  newCameraIp: string;
  status: 'cadastrado' | 'vago' | '';
  location: string;
  newLocation: string;
  observation: string;
}

export interface ParsedNVR {
  name: string;
  ip: string;
  totalChannels: number;
  usedChannels: number[];
  vacantChannels: number[];
  cameras: CameraCSVRow[];
}

export interface CSVParseResult {
  nvrs: ParsedNVR[];
  totalCameras: number;
  totalVacant: number;
  errors: string[];
}

// Decode Latin-1 encoded text
function decodeText(text: string): string {
  try {
    // Try to handle common encoding issues
    return text
      .replace(/�/g, 'ã')
      .replace(/Port�o/g, 'Portão')
      .replace(/P�tio/g, 'Pátio')
      .replace(/Localiza��o/g, 'Localização')
      .replace(/Observa��o/g, 'Observação')
      .replace(/Descri��o/g, 'Descrição')
      .replace(/Respons�vel/g, 'Responsável');
  } catch {
    return text;
  }
}

// Parse CSV content with semicolon delimiter
export function parseCSV(content: string): CSVParseResult {
  const lines = content.trim().split('\n');
  const errors: string[] = [];
  const nvrMap = new Map<string, ParsedNVR>();
  
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = decodeText(lines[i].trim());
    if (!line) continue;
    
    const columns = line.split(';');
    
    // Parse channel number
    const channel = parseInt(columns[0], 10);
    if (isNaN(channel)) {
      errors.push(`Linha ${i + 1}: Canal inválido`);
      continue;
    }
    
    const nvrField = columns[1]?.trim() || '';
    const cameraIp = columns[2]?.trim() || '';
    const newCameraIp = columns[3]?.trim() || '';
    const statusRaw = columns[4]?.trim().toLowerCase() || '';
    const location = columns[5]?.trim() || '';
    const newLocation = columns[6]?.trim() || '';
    const observation = columns[7]?.trim() || '';
    
    // Extract NVR IP from field like "NVR 10.3.30.10"
    const nvrIpMatch = nvrField.match(/(\d+\.\d+\.\d+\.\d+)/);
    const nvrIp = nvrIpMatch ? nvrIpMatch[1] : '';
    
    // Determine status
    let status: 'cadastrado' | 'vago' | '' = '';
    if (statusRaw === 'cadastrado') {
      status = 'cadastrado';
    } else if (!nvrField && !cameraIp) {
      status = 'vago';
    }
    
    const row: CameraCSVRow = {
      channel,
      nvrName: nvrField,
      nvrIp,
      cameraIp,
      newCameraIp,
      status,
      location,
      newLocation,
      observation
    };
    
    // Group by NVR - for vacant channels, we need to infer the NVR based on position
    if (nvrIp) {
      if (!nvrMap.has(nvrIp)) {
        nvrMap.set(nvrIp, {
          name: nvrField,
          ip: nvrIp,
          totalChannels: 0,
          usedChannels: [],
          vacantChannels: [],
          cameras: []
        });
      }
      
      const nvr = nvrMap.get(nvrIp)!;
      nvr.cameras.push(row);
      
      if (status === 'cadastrado') {
        nvr.usedChannels.push(channel);
      }
    } else if (status === 'vago') {
      // For vacant channels without NVR info, we'll mark them separately
      // They'll be assigned to the last known NVR context
    }
  }
  
  // Calculate total channels per NVR based on max channel number
  const nvrs = Array.from(nvrMap.values()).map(nvr => {
    const maxChannel = Math.max(...nvr.cameras.map(c => c.channel), 0);
    nvr.totalChannels = maxChannel <= 16 ? 16 : 32;
    
    // Calculate vacant channels
    for (let i = 1; i <= nvr.totalChannels; i++) {
      if (!nvr.usedChannels.includes(i)) {
        nvr.vacantChannels.push(i);
      }
    }
    
    return nvr;
  });
  
  return {
    nvrs,
    totalCameras: nvrs.reduce((sum, nvr) => sum + nvr.usedChannels.length, 0),
    totalVacant: nvrs.reduce((sum, nvr) => sum + nvr.vacantChannels.length, 0),
    errors
  };
}

// Infer camera model from description
export function inferCameraModel(description: string): { templateId: string; modelName: string } {
  const desc = description.toLowerCase();
  
  if (desc.includes('ptz') && desc.includes('gs500')) {
    return { templateId: 'gs_gs500_2mp', modelName: 'GS500 PTZ 2MP' };
  }
  if (desc.includes('gs500')) {
    return { templateId: 'gs_gs500_2mp', modelName: 'GS500 2MP' };
  }
  if (desc.includes('vipc') && desc.includes('intelbras')) {
    return { templateId: 'int_vipc1230bg2', modelName: 'VIP C 1230 B G2 Intelbras' };
  }
  if (desc.includes('vip') && desc.includes('intelbras') && desc.includes('ptz')) {
    return { templateId: 'int_vip5215sd', modelName: 'VIP 5215 SD PTZ Intelbras' };
  }
  if (desc.includes('vip') && desc.includes('intelbras')) {
    return { templateId: 'int_vip1230bg5', modelName: 'VIP 1230 B G5 Intelbras' };
  }
  
  // Default to generic camera
  return { templateId: 'generic', modelName: 'Câmera IP Genérica' };
}

// Read file content with proper encoding handling
export async function readCSVFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const result = e.target?.result as string;
      resolve(result);
    };
    
    reader.onerror = () => {
      reject(new Error('Erro ao ler arquivo CSV'));
    };
    
    // Read as UTF-8, we'll handle encoding issues in parsing
    reader.readAsText(file, 'UTF-8');
  });
}
