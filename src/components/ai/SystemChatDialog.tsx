import { useState, useRef, useEffect } from 'react';
import { X, Send, Trash2, Bot, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from './ChatMessage';
import type { ChatMessage as ChatMessageType } from '@/hooks/useSystemChat';

interface SystemChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessageType[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  onClearMessages: () => void;
}

const SUGGESTIONS = [
  "Como criar um novo chamado?",
  "Quais tipos de alerta existem?",
  "Como funciona a hierarquia de locais?",
  "Como configurar notificações WhatsApp?",
  "Quais comandos do bot WhatsApp?",
];

export function SystemChatDialog({
  isOpen,
  onClose,
  messages,
  isLoading,
  onSendMessage,
  onClearMessages,
}: SystemChatDialogProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleSuggestion = (suggestion: string) => {
    onSendMessage(suggestion);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-36 right-4 z-50 w-[400px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-12rem)] bg-background border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-primary/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Assistente do Sistema</h3>
            <p className="text-xs text-muted-foreground">Pergunte qualquer coisa sobre o sistema</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onClearMessages} title="Limpar conversa">
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h4 className="font-semibold mb-2">Como posso ajudar?</h4>
            <p className="text-sm text-muted-foreground mb-6">
              Pergunte sobre funcionalidades, alertas, chamados, equipamentos, ou qualquer aspecto do sistema.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map((suggestion, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => handleSuggestion(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                role={msg.role}
                content={msg.content}
                timestamp={msg.timestamp}
              />
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground p-3">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Pensando...</span>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t bg-muted/30">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua pergunta..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!input.trim() || isLoading}
            className="bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
