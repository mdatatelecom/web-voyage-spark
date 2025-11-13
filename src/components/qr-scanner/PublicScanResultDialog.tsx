import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lock, CheckCircle } from 'lucide-react';

interface PublicScanResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionCode: string;
  connectionId: string;
}

export const PublicScanResultDialog = ({
  open,
  onOpenChange,
  connectionCode,
  connectionId,
}: PublicScanResultDialogProps) => {
  const navigate = useNavigate();

  const handleLogin = () => {
    // Salvar connection_id para redirecionar após login
    sessionStorage.setItem('redirect_after_login', `/connections/${connectionId}`);
    navigate('/auth');
  };

  const handleScanAgain = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            QR Code Detectado!
          </DialogTitle>
          <DialogDescription>
            Conexão identificada com sucesso
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Código da Conexão</div>
            <div className="text-2xl font-bold">{connectionCode}</div>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <div className="font-semibold mb-2">Faça login para ver detalhes completos</div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Equipamentos conectados</li>
                  <li>• Tipo de cabo e comprimento</li>
                  <li>• Localização dos racks</li>
                  <li>• Status da conexão</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button onClick={handleLogin} className="w-full">
              Fazer Login
            </Button>
            <Button onClick={handleScanAgain} variant="outline" className="w-full">
              Escanear Outro QR Code
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
