import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function useSystemChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Load chat history when opening
  useEffect(() => {
    if (isOpen && user && !historyLoaded) {
      loadHistory();
    }
  }, [isOpen, user, historyLoaded]);

  const loadHistory = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id, role, content, created_at')
        .eq('user_id', user.id)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading chat history:', error);
        return;
      }

      if (data && data.length > 0) {
        setMessages(data.map(msg => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.created_at),
        })));
      }
      setHistoryLoaded(true);
    } catch (err) {
      console.error('Error loading chat history:', err);
    }
  }, [user, sessionId]);

  const saveMessage = useCallback(async (role: 'user' | 'assistant', content: string) => {
    if (!user) return;

    try {
      await supabase.from('chat_messages').insert({
        user_id: user.id,
        session_id: sessionId,
        role,
        content,
      });
    } catch (err) {
      console.error('Error saving message:', err);
    }
  }, [user, sessionId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Save user message to database
    await saveMessage('user', content.trim());

    try {
      const { data, error } = await supabase.functions.invoke('system-chat', {
        body: { message: content.trim(), sessionId }
      });

      if (error) {
        console.error('Chat error:', error);
        toast.error('Erro ao processar mensagem');
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Save assistant message to database
      await saveMessage('assistant', data.response);
    } catch (err) {
      console.error('Chat error:', err);
      toast.error('Erro de conexão com o assistente');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, sessionId, saveMessage]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return {
    messages,
    isLoading,
    isOpen,
    sendMessage,
    clearMessages,
    toggle,
    open,
    close,
  };
}
