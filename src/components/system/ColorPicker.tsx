import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
}

export const ColorPicker = ({ label, value, onChange, description }: ColorPickerProps) => {
  const hslToHex = (hsl: string): string => {
    const [h, s, l] = hsl.split(' ').map(v => parseFloat(v.replace('%', '')));
    const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = (l / 100) - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  const hexToHsl = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const [hexValue, setHexValue] = useState(hslToHex(value));

  const handleHexChange = (newHex: string) => {
    setHexValue(newHex);
    const hsl = hexToHsl(newHex);
    onChange(hsl);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-20 p-0 h-10">
              <div
                className="w-full h-full rounded"
                style={{ backgroundColor: hexValue }}
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="space-y-3">
              <input
                type="color"
                value={hexValue}
                onChange={(e) => handleHexChange(e.target.value)}
                className="w-full h-32 cursor-pointer rounded"
              />
              <Input
                value={hexValue}
                onChange={(e) => handleHexChange(e.target.value)}
                placeholder="#000000"
              />
              <div className="text-xs text-muted-foreground">
                HSL: {value}
              </div>
            </div>
          </PopoverContent>
        </Popover>
        <Input value={value} readOnly className="flex-1 font-mono text-xs" />
      </div>
    </div>
  );
};
