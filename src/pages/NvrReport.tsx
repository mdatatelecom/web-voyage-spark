import { AppLayout } from '@/components/layout/AppLayout';
import { NvrChannelReport } from '@/components/equipment/NvrChannelReport';
import { Server } from 'lucide-react';

export default function NvrReport() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Server className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Relatório de Ocupação de NVRs</h1>
            <p className="text-muted-foreground">
              Visualize a ocupação de canais em todos os NVRs cadastrados
            </p>
          </div>
        </div>
        
        <NvrChannelReport />
      </div>
    </AppLayout>
  );
}
