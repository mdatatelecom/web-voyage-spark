import { Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  const isAssistant = role === 'assistant';

  // Simple markdown-like formatting
  const formatContent = (text: string) => {
    return text
      .split('\n')
      .map((line, i) => {
        // Headers
        if (line.startsWith('### ')) {
          return <h4 key={i} className="font-semibold text-sm mt-2 mb-1">{line.slice(4)}</h4>;
        }
        if (line.startsWith('## ')) {
          return <h3 key={i} className="font-semibold text-base mt-2 mb-1">{line.slice(3)}</h3>;
        }
        if (line.startsWith('# ')) {
          return <h2 key={i} className="font-bold text-lg mt-2 mb-1">{line.slice(2)}</h2>;
        }
        
        // List items
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return <li key={i} className="ml-4 list-disc">{formatInline(line.slice(2))}</li>;
        }
        if (/^\d+\.\s/.test(line)) {
          return <li key={i} className="ml-4 list-decimal">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>;
        }
        
        // Empty lines
        if (!line.trim()) {
          return <br key={i} />;
        }
        
        return <p key={i} className="mb-1">{formatInline(line)}</p>;
      });
  };

  const formatInline = (text: string) => {
    // Bold
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      // Code
      const codeParts = part.split(/(`[^`]+`)/g);
      return codeParts.map((codePart, j) => {
        if (codePart.startsWith('`') && codePart.endsWith('`')) {
          return <code key={`${i}-${j}`} className="bg-muted px-1 rounded text-xs">{codePart.slice(1, -1)}</code>;
        }
        return codePart;
      });
    });
  };

  return (
    <div className={cn(
      "flex gap-3 p-3 rounded-lg",
      isAssistant ? "bg-muted/50" : "bg-primary/5"
    )}>
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
        isAssistant ? "bg-primary text-primary-foreground" : "bg-muted"
      )}>
        {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium">
            {isAssistant ? 'Assistente' : 'Você'}
          </span>
          <span className="text-xs text-muted-foreground">
            {timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
          {formatContent(content)}
        </div>
      </div>
    </div>
  );
}
