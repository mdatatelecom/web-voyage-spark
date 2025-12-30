import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';

// Configure worker for v3.x
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

export interface PdfConversionResult {
  blob: Blob;
  width: number;
  height: number;
}

export interface PdfPageInfo {
  pageCount: number;
  previews: string[];
}

export async function getPdfPageCount(file: File): Promise<number> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  return pdf.numPages;
}

export async function getPdfPagePreviews(file: File, maxPages: number = 10): Promise<PdfPageInfo> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageCount = pdf.numPages;
  const previews: string[] = [];
  
  const pagesToPreview = Math.min(pageCount, maxPages);
  
  for (let i = 1; i <= pagesToPreview; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 0.3 }); // Small preview
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) continue;
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;
    
    previews.push(canvas.toDataURL('image/png', 0.6));
  }
  
  return { pageCount, previews };
}

export async function convertPdfPageToImage(file: File, pageNumber: number, scale: number = 2): Promise<PdfConversionResult> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  if (!context) {
    throw new Error('Could not get canvas context');
  }
  
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  await page.render({
    canvasContext: context,
    viewport: viewport,
  }).promise;
  
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve({
            blob,
            width: Math.round(viewport.width / scale),
            height: Math.round(viewport.height / scale),
          });
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      },
      'image/png',
      0.95
    );
  });
}

export async function convertPdfToImage(file: File, scale: number = 2): Promise<PdfConversionResult> {
  return convertPdfPageToImage(file, 1, scale);
}

export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}
