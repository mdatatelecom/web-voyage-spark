import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '52428800'); // 50MB
const STORAGE_URL = process.env.STORAGE_URL || 'http://localhost:3000/uploads';

// Criar diretório de upload se não existir
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Tipos de arquivo permitidos
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
];

// Configuração do storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Criar subdiretório baseado no tipo
    const subDir = getSubDirectory(file.mimetype);
    const fullPath = path.join(UPLOAD_DIR, subDir);
    
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
    
    cb(null, fullPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

// Determinar subdiretório
function getSubDirectory(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'images';
  if (mimeType.startsWith('video/')) return 'videos';
  if (mimeType.startsWith('audio/')) return 'audios';
  return 'documents';
}

// Filtro de arquivo
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de arquivo não permitido: ${file.mimetype}`));
  }
};

// Configuração do multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10, // Máximo de 10 arquivos por vez
  },
});

// Gerar URL pública do arquivo
export function getFileUrl(filePath: string): string {
  const relativePath = filePath.replace(UPLOAD_DIR, '').replace(/\\/g, '/');
  return `${STORAGE_URL}${relativePath}`;
}

// Deletar arquivo
export async function deleteFile(filePath: string): Promise<boolean> {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}

// Upload para ticket attachments
export const ticketAttachmentUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const ticketId = req.params.ticketId || 'unknown';
      const fullPath = path.join(UPLOAD_DIR, 'ticket-attachments', ticketId);
      
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
      
      cb(null, fullPath);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const uniqueName = `${Date.now()}_${uuidv4().substring(0, 8)}${ext}`;
      cb(null, uniqueName);
    },
  }),
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 5,
  },
});

export default { upload, getFileUrl, deleteFile, ticketAttachmentUpload };
