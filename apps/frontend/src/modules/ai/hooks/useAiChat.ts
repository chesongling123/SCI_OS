import { useState, useCallback, useRef } from 'react';
import type { ChatMessage, ToolCallInfo, ChatOptions } from '../types/ai.types';
import { authHeaders } from '../../../lib/api';

const API_BASE = '/api/v1/ai';

/**
 * Mock 回复生成器 —— 后端接口未就绪或离线时使用
 */
async function* mockStream(userMessage: string): AsyncGenerator<string> {
  const lower = userMessage.toLowerCase();

  let response = '';
  if (lower.includes('专注') || lower.includes('番茄')) {
    response = '根据你今天的番茄钟数据，你已经专注了 2 小时 15 分钟，完成了 5 个番茄钟，中断 1 次。最佳专注时段是上午 9:00-11:00。';
  } else if (lower.includes('任务') || lower.includes('待办')) {
    response = '你当前有 3 个待办任务、2 个进行中任务。优先级最高的是「完成论文第三章草稿」，建议安排在明天的上午专注时段处理。';
  } else if (lower.includes('日程') || lower.includes('会议')) {
    response = '今天你有 2 个日程：14:00 组会汇报、16:30 导师讨论。明天的日程目前为空，可以安排深度工作。';
  } else if (lower.includes('你好') || lower.includes('hi')) {
    response = '你好！我是你的 PhD_AI 科研助手。我可以帮你查看任务进度、分析专注数据、搜索文献，或者生成研究日记。有什么可以帮你的吗？';
  } else {
    response = '收到你的问题。我目前处于离线模式，AI 服务暂时不可用。你可以尝试问我关于「任务」「番茄钟」「日程」的问题来体验模拟回复。';
  }

  for (const char of response) {
    await new Promise((r) => setTimeout(r, 25 + Math.random() * 30));
    yield char;
  }
}

/**
 * AI 聊天 Hook
 * 支持 SSE 流式对话 + mock 降级模式
 */
export function useAiChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasSwitchedToMock, setHasSwitchedToMock] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const useMock = hasSwitchedToMock;

  /**
   * 发送消息 —— 自动处理 SSE 流
   */
  const sendMessage = useCallback(
    async (userMessage: string, options: ChatOptions = {}) => {
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);

      const assistantId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          status: 'streaming',
        },
      ]);

      setIsStreaming(true);
      abortControllerRef.current = new AbortController();

      try {
        let fullResponse = '';
        let toolCalls: ToolCallInfo[] = [];

        if (useMock) {
          for await (const token of mockStream(userMessage)) {
            fullResponse += token;
            options.onToken?.(token);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantId ? { ...msg, content: fullResponse } : msg
              )
            );
          }
        } else {
          const res = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ message: userMessage }),
            signal: abortControllerRef.current.signal,
          });

          // 401: 未登录
          if (res.status === 401) {
            setHasSwitchedToMock(true);
            fullResponse = '请先登录后再使用 AI 助手。';
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantId ? { ...msg, content: fullResponse, status: 'complete' } : msg
              )
            );
            setIsStreaming(false);
            return;
          }

          // 后端接口不存在（404）或其他错误
          if (!res.ok) {
            setHasSwitchedToMock(true);
            for await (const token of mockStream(userMessage)) {
              fullResponse += token;
              options.onToken?.(token);
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantId ? { ...msg, content: fullResponse } : msg
                )
              );
            }
          } else {
            // SSE 流式读取
            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            if (!reader) throw new Error('No response body');

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (!line.startsWith('data: ')) continue;

                try {
                  const data = JSON.parse(line.slice(6));

                  if (data.type === 'token') {
                    fullResponse += data.content;
                    options.onToken?.(data.content);
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === assistantId ? { ...msg, content: fullResponse } : msg
                      )
                    );
                  } else if (data.type === 'tool_call') {
                    toolCalls = updateToolCalls(toolCalls, data);
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === assistantId ? { ...msg, toolCalls: [...toolCalls] } : msg
                      )
                    );
                  } else if (data.type === 'done') {
                    // 流结束
                  } else if (data.type === 'error') {
                    throw new Error(data.message);
                  }
                } catch {
                  // 跳过格式错误的 SSE 行
                }
              }
            }
          }
        }

        // 检测到 AI 创建/更新笔记后，通知笔记页面刷新
        const hasNoteOperation = toolCalls.some(
          (t) => t.tool === 'create_note' || t.tool === 'update_note'
        );
        if (hasNoteOperation) {
          window.dispatchEvent(new CustomEvent('phd:note-changed'));
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? { ...msg, status: 'complete', toolCalls: toolCalls.length > 0 ? toolCalls : undefined }
              : msg
          )
        );
        options.onComplete?.(fullResponse);
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId
                ? { ...msg, status: 'complete', content: msg.content + '\n\n[已取消]' }
                : msg
            )
          );
        } else {
          const msg = error instanceof Error ? error.message : '未知错误';
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, status: 'error', content: `Error: ${msg}` } : m
            )
          );
          options.onError?.(error instanceof Error ? error : new Error(String(error)));
        }
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [useMock]
  );

  /**
   * 重置 mock 状态
   */
  const resetMock = useCallback(() => {
    setHasSwitchedToMock(false);
  }, []);

  /**
   * 取消当前流式输出
   */
  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  /**
   * 清空对话历史
   */
  const clear = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, isStreaming, sendMessage, cancel, clear, useMock, resetMock };
}

function updateToolCalls(
  calls: ToolCallInfo[],
  event: { tool: string; status: string; params?: Record<string, unknown> }
): ToolCallInfo[] {
  const existing = calls.findIndex((c) => c.tool === event.tool && c.status !== 'complete');
  const newCall: ToolCallInfo = {
    tool: event.tool,
    status: event.status as ToolCallInfo['status'],
    params: event.params,
  };

  if (existing >= 0) {
    const updated = [...calls];
    updated[existing] = newCall;
    return updated;
  }
  return [...calls, newCall];
}
