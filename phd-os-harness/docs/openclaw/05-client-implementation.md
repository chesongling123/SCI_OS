# Client Implementation Reference: Frontend AI Chat Integration

> Reference patterns for integrating OpenClaw streaming responses into the PhD_OS React frontend.

---

## 1. Architecture Overview

```
User Input → React Component → POST /api/v1/ai/chat → NestJS Controller
                                                      ↓
                                              OpenClawService
                                                      ↓
                                              WebSocket → OpenClaw Gateway
                                                      ↓
                                              SSE Stream ← Response Tokens
                                                      ↓
Frontend EventSource ←─── SSE chunks ───── NestJS Controller
```

## 2. API Client Hook

```typescript
// apps/frontend/src/modules/ai/hooks/useAiChat.ts
import { useState, useCallback, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  status?: 'streaming' | 'complete' | 'error';
}

interface ChatOptions {
  skill?: string;
  onToken?: (token: string) => void;
  onComplete?: (fullResponse: string) => void;
  onError?: (error: Error) => void;
}

export function useAiChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (
    userMessage: string,
    options: ChatOptions = {}
  ) => {
    // Add user message
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    // Add placeholder assistant message
    const assistantId = crypto.randomUUID();
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      status: 'streaming',
    }]);

    setIsStreaming(true);

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          skill: options.skill,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Read SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      if (!reader) throw new Error('No response body');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'token') {
                fullResponse += data.content;
                options.onToken?.(data.content);
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantId
                      ? { ...msg, content: fullResponse }
                      : msg
                  )
                );
              } else if (data.type === 'done') {
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantId
                      ? { ...msg, status: 'complete' }
                      : msg
                  )
                );
              } else if (data.type === 'error') {
                throw new Error(data.message);
              }
            } catch {
              // Skip malformed SSE lines
            }
          }
        }
      }

      options.onComplete?.(fullResponse);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantId
              ? { ...msg, status: 'complete', content: msg.content + '\n\n[Cancelled]' }
              : msg
          )
        );
      } else {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantId
              ? { ...msg, status: 'error', content: 'Error: ' + (error as Error).message }
              : msg
          )
        );
        options.onError?.(error as Error);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, isStreaming, sendMessage, cancel, clear };
}
```

## 3. Chat UI Component (Liquid Glass)

```tsx
// apps/frontend/src/modules/ai/components/AiChatPanel.tsx
import { useState, useRef, useEffect } from 'react';
import { useAiChat } from '../hooks/useAiChat';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { Send, Square, Loader2 } from 'lucide-react';

export function AiChatPanel() {
  const [input, setInput] = useState('');
  const { messages, isStreaming, sendMessage, cancel } = useAiChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    const message = input.trim();
    setInput('');
    await sendMessage(message);
  };

  return (
    <GlassCard className="flex flex-col h-[600px] w-full max-w-2xl mx-auto">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-glass-muted mt-20">
            <p className="text-lg font-medium">PhD_AI Assistant</p>
            <p className="text-sm mt-2">Ask me about your research, schedule, or tasks</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                msg.role === 'user'
                  ? 'bg-primary/20 text-foreground'
                  : 'glass-surface text-foreground'
              }`}
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
              {msg.status === 'streaming' && (
                <Loader2 className="w-3 h-3 animate-spin mt-1 text-muted-foreground" />
              )}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-glass-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your research..."
            className="flex-1 glass-input rounded-xl px-4 py-2.5 text-sm
                       placeholder:text-glass-muted
                       focus:outline-none focus:ring-2 focus:ring-primary/30"
            disabled={isStreaming}
          />
          {isStreaming ? (
            <GlassButton
              type="button"
              onClick={cancel}
              variant="destructive"
              size="icon"
            >
              <Square className="w-4 h-4" />
            </GlassButton>
          ) : (
            <GlassButton
              type="submit"
              disabled={!input.trim()}
              size="icon"
            >
              <Send className="w-4 h-4" />
            </GlassButton>
          )}
        </div>
      </form>
    </GlassCard>
  );
}
```

## 4. Tool Call Visualization

When the agent calls MCP tools, show the user what's happening:

```tsx
// apps/frontend/src/modules/ai/components/ToolCallIndicator.tsx
import { Loader2, Check, Database, Calendar, Timer } from 'lucide-react';

interface ToolCall {
  tool: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  params?: Record<string, any>;
}

const toolIcons: Record<string, typeof Timer> = {
  'phd-pomodoro': Timer,
  'phd-task': Check,
  'phd-calendar': Calendar,
  default: Database,
};

export function ToolCallIndicator({ calls }: { calls: ToolCall[] }) {
  return (
    <div className="space-y-1.5 my-2">
      {calls.map((call, i) => {
        const Icon = toolIcons[call.tool.split('/')[0]] || toolIcons.default;
        return (
          <div
            key={i}
            className="flex items-center gap-2 text-xs text-muted-foreground
                       glass-surface rounded-lg px-3 py-1.5"
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="font-mono">{call.tool}</span>
            {call.status === 'running' && (
              <Loader2 className="w-3 h-3 animate-spin ml-auto" />
            )}
            {call.status === 'complete' && (
              <Check className="w-3 h-3 text-green-500 ml-auto" />
            )}
          </div>
        );
      })}
    </div>
  );
}
```

## 5. Route Setup

```tsx
// apps/frontend/src/modules/ai/index.ts
export { AiChatPanel } from './components/AiChatPanel';
export { useAiChat } from './hooks/useAiChat';

// apps/frontend/src/router.tsx
import { AiChatPanel } from '@/modules/ai';

// Add route
<Route path="/ai" element={<AiChatPanel />} />
```

Add to the glass navigation bar in `Layout.tsx`:

```tsx
<NavLink to="/ai" className={glassNavLinkClass}>
  <Sparkles className="w-5 h-5" />
  <span>AI Assistant</span>
</NavLink>
```

## 6. Error Handling Patterns

| Error Type | Frontend Behavior | Recovery |
|------------|-------------------|----------|
| Gateway disconnected | Show "AI service unavailable" banner | Auto-retry with backoff |
| Tool call failed | Show tool error in chat | User can retry |
| Stream interrupted | Show partial response + "[Interrupted]" | User can re-send |
| Rate limited | Show "Too many requests" | Wait + retry |

```typescript
// Error boundary for AI chat
// apps/frontend/src/modules/ai/components/AiChatErrorBoundary.tsx
export class AiChatErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <GlassCard className="p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            AI chat encountered an error. Please refresh the page.
          </p>
        </GlassCard>
      );
    }
    return this.props.children;
  }
}
```

## 7. Frontend Implementation Checklist

- [ ] `useAiChat` hook handles SSE streaming correctly
- [ ] Chat UI uses liquid glass design system components
- [ ] Auto-scroll to bottom on new messages
- [ ] Cancel button stops ongoing stream
- [ ] Loading indicators for streaming state
- [ ] Error states displayed gracefully
- [ ] Tool call visualization shows user what agent is doing
- [ ] Route `/ai` registered in router
- [ ] Nav link added to glass navigation bar
