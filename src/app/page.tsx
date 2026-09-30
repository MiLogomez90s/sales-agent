'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface ChatMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: Array<{ function: { name: string; arguments: string } }>;
}

interface AgentEvent {
  type: 'thinking' | 'tool_call' | 'tool_result' | 'message' | 'error' | 'done';
  data: unknown;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const userMessage: ChatMessage = { role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);
    setIsLoading(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, conversationId }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let assistantContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;

          try {
            const event = JSON.parse(data) as AgentEvent;

            switch (event.type) {
              case 'thinking':
                // Could show a thinking indicator
                break;
              case 'tool_call': {
                const toolData = event.data as { name: string; arguments: Record<string, unknown> };
                setMessages((prev) => [
                  ...prev,
                  {
                    role: 'tool',
                    content: `🔧 Calling: ${toolData.name}(${JSON.stringify(toolData.arguments)})`,
                  },
                ]);
                break;
              }
              case 'tool_result': {
                const resultData = event.data as { name: string; success: boolean; data: unknown };
                setMessages((prev) => [
                  ...prev,
                  {
                    role: 'tool',
                    content: `${resultData.success ? '✅' : '❌'} ${resultData.name}: ${JSON.stringify(resultData.data).slice(0, 200)}`,
                  },
                ]);
                break;
              }
              case 'message':
                assistantContent = event.data as string;
                setMessages((prev) => {
                  // Remove last assistant message if exists, then add new
                  const filtered = prev.filter((m, i) => !(m.role === 'assistant' && i === prev.length - 1));
                  return [...filtered, { role: 'assistant', content: assistantContent }];
                });
                break;
              case 'error':
                setMessages((prev) => [
                  ...prev,
                  { role: 'assistant', content: `❌ Error: ${event.data}` },
                ]);
                break;
              case 'done': {
                const doneData = event.data as { conversationId?: string };
                if (doneData.conversationId) {
                  setConversationId(doneData.conversationId);
                }
                break;
              }
            }
          } catch {
            // Skip malformed events
          }
        }
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ]);
    } finally {
      setIsStreaming(false);
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setConversationId(undefined);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Chat</h2>
          <p className="text-xs text-gray-500">
            {conversationId ? `Conversation: ${conversationId.slice(0, 20)}...` : 'New conversation'}
          </p>
        </div>
        <button
          onClick={handleNewChat}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          New Chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-4xl mb-3">💬</div>
              <h3 className="text-lg font-medium text-gray-900">Start a conversation</h3>
              <p className="text-sm text-gray-500 mt-1">
                Chat with your sales agent. It can use tools to help close deals.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-lg px-4 py-2.5 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : msg.role === 'tool'
                  ? 'bg-gray-100 text-gray-600 font-mono text-xs'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {isLoading && messages.length > 0 && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.3s]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 px-6 py-4">
        <div className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            rows={1}
            className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[42px] max-h-[200px]"
            style={{ height: 'auto' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isStreaming ? '...' : 'Send'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
