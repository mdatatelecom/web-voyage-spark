import { AlertTriangle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ContrastValidatorProps {
  foreground: string; // HSL format
  background: string; // HSL format
  label: string;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [255 * f(0), 255 * f(8), 255 * f(4)];
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(fg: string, bg: string): number {
  const parseFg = fg.split(' ').map(parseFloat);
  const parseBg = bg.split(' ').map(parseFloat);
  
  const [r1, g1, b1] = hslToRgb(parseFg[0], parseFg[1], parseFg[2]);
  const [r2, g2, b2] = hslToRgb(parseBg[0], parseBg[1], parseBg[2]);
  
  const l1 = getLuminance(r1, g1, b1);
  const l2 = getLuminance(r2, g2, b2);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

export const ContrastValidator = ({ foreground, background, label }: ContrastValidatorProps) => {
  const ratio = getContrastRatio(foreground, background);
  const passesAA = ratio >= 4.5;
  const passesAAA = ratio >= 7;
  
  if (passesAAA) {
    return (
      <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertDescription className="text-green-800 dark:text-green-200">
          <strong>{label}:</strong> Contraste excelente ({ratio.toFixed(2)}:1) - WCAG AAA ✓
        </AlertDescription>
      </Alert>
    );
  }
  
  if (passesAA) {
    return (
      <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
        <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          <strong>{label}:</strong> Contraste bom ({ratio.toFixed(2)}:1) - WCAG AA ✓
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
      <AlertDescription className="text-yellow-800 dark:text-yellow-200">
        <strong>{label}:</strong> Contraste insuficiente ({ratio.toFixed(2)}:1) - Recomenda-se ≥ 4.5:1
      </AlertDescription>
    </Alert>
  );
};
