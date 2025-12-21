import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageCircle, Loader2, Send } from 'lucide-react';
import { useWhatsApp } from '@/hooks/useWhatsApp';

interface WhatsAppButtonProps {
  phone: string;
  ticketNumber: string;
  ticketTitle: string;
  ticketId: string;
}

export function WhatsAppButton({ phone, ticketNumber, ticketTitle, ticketId }: WhatsAppButtonProps) {
  const { sendMessage } = useWhatsApp();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [customMessage, setCustomMessage] = useState('');

  const defaultMessage = `Olá! Este é um contato referente ao chamado *${ticketNumber}*.\n\n` +
    `Título: ${ticketTitle}\n\n` +
    `Em que posso ajudar?`;

  const handleSend = async () => {
    setIsSending(true);
    const messageToSend = customMessage.trim() || defaultMessage;
    const result = await sendMessage(phone, messageToSend, ticketId);
    setIsSending(false);
    
    if (result.success) {
      setDialogOpen(false);
      setCustomMessage('');
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100 hover:text-green-800"
        onClick={() => setDialogOpen(true)}
      >
        <MessageCircle className="h-4 w-4 mr-2" />
        WhatsApp
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              Enviar WhatsApp
            </DialogTitle>
            <DialogDescription>
              Enviar mensagem para {phone} referente ao chamado {ticketNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea
                value={customMessage || defaultMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={6}
                placeholder="Digite sua mensagem..."
              />
              <p className="text-xs text-muted-foreground">
                Você pode personalizar a mensagem ou usar a sugestão padrão.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSending}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
