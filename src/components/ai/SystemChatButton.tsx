import { Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SystemChatDialog } from './SystemChatDialog';
import { useSystemChat } from '@/hooks/useSystemChat';

export function SystemChatButton() {
  const {
    messages,
    isLoading,
    isOpen,
    sendMessage,
    clearMessages,
    toggle,
    close,
  } = useSystemChat();

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={toggle}
            size="icon"
            className="fixed bottom-20 right-4 z-[60] h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all"
          >
            <Bot className="w-6 h-6" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Assistente IA do Sistema</p>
        </TooltipContent>
      </Tooltip>

      <SystemChatDialog
        isOpen={isOpen}
        onClose={close}
        messages={messages}
        isLoading={isLoading}
        onSendMessage={sendMessage}
        onClearMessages={clearMessages}
      />
    </>
  );
}
