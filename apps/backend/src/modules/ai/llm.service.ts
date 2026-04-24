import { Injectable, Logger } from '@nestjs/common';

/* ═══════════════════════════════════════════════════════════════
   类型定义
   ═══════════════════════════════════════════════════════════════ */

/** 统一的消息格式 */
export interface LlmMessage {
  role: 'user' | 'assistant';
  content: string | LlmContentBlock[];
}

export interface LlmContentBlock {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
}

/** 统一工具定义 */
export interface LlmTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/** SSE 流式输出块 */
export type StreamChunk =
  | { type: 'token'; content: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_call'; tool: string; status: 'running' | 'complete' | 'error'; params?: Record<string, unknown>; result?: string }
  | { type: 'done'; stopReason: string }
  | { type: 'error'; message: string };

/** 提供商配置 */
interface ProviderConfig {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  maxTokens: number;
}

/* ═══════════════════════════════════════════════════════════════
   SSE 解析器（通用版，兼容 Anthropic event: 和 OpenAI 纯 data:）
   ═══════════════════════════════════════════════════════════════ */

async function* parseSse(reader: ReadableStreamDefaultReader<Uint8Array>): AsyncGenerator<{ event?: string; data: unknown }> {
  const decoder = new TextDecoder();
  let buffer = '';
  let currentEvent: string | undefined;
  let currentData: unknown = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        // 空行表示一个事件结束
        if (currentData !== null) {
          yield { event: currentEvent, data: currentData };
          currentEvent = undefined;
          currentData = null;
        }
        continue;
      }
      if (trimmed.startsWith('event:')) {
        currentEvent = trimmed.slice(6).trim();
      } else if (trimmed.startsWith('data:')) {
        const dataStr = trimmed.slice(5).trim();
        if (dataStr === '[DONE]') {
          currentData = { __done: true };
        } else {
          try {
            currentData = JSON.parse(dataStr);
          } catch {
            currentData = dataStr;
          }
        }
      }
    }
  }

  // 处理 buffer 中剩余的内容
  if (buffer.trim()) {
    const trimmed = buffer.trim();
    if (trimmed.startsWith('data:')) {
      const dataStr = trimmed.slice(5).trim();
      try {
        yield { data: JSON.parse(dataStr) };
      } catch {
        yield { data: dataStr };
      }
    }
  }
}

/* ═══════════════════════════════════════════════════════════════
   LlmService
   ═══════════════════════════════════════════════════════════════ */

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly config: ProviderConfig;
  private readonly provider: 'anthropic' | 'openai';

  constructor() {
    const provider = (process.env.AI_PROVIDER ?? 'kimi-coding').toLowerCase();

    if (provider === 'kimi-coding') {
      this.provider = 'anthropic';
      this.config = {
        name: 'kimi-coding',
        baseUrl: this.trimTrailingSlash(process.env.KIMI_CODING_BASE_URL ?? 'https://api.kimi.com/coding'),
        apiKey: process.env.KIMI_CODING_API_KEY ?? '',
        model: process.env.KIMI_CODING_MODEL ?? 'k2p5',
        maxTokens: Number(process.env.AI_MAX_TOKENS ?? '4096'),
      };
    } else {
      // openai-compatible: deepseek / moonshot / openai
      this.provider = 'openai';
      this.config = {
        name: provider,
        baseUrl: this.trimTrailingSlash(process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1'),
        apiKey: process.env.OPENAI_API_KEY ?? '',
        model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        maxTokens: Number(process.env.AI_MAX_TOKENS ?? '4096'),
      };
    }

    if (!this.config.apiKey) {
      this.logger.warn(`AI API Key 未配置 (${this.config.name})，AI 功能将不可用`);
    }
  }

  private trimTrailingSlash(url: string): string {
    return url.replace(/\/$/, '');
  }

  /**
   * 检查 LLM API 可用性
   */
  async healthCheck(): Promise<{ status: string; provider: string; latency: number }> {
    const start = Date.now();
    try {
      if (!this.config.apiKey) {
        return { status: 'no_key', provider: this.config.name, latency: -1 };
      }

      if (this.provider === 'anthropic') {
        const res = await fetch(`${this.config.baseUrl}/v1/messages`, {
          method: 'POST',
          headers: {
            'x-api-key': this.config.apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.config.model,
            messages: [{ role: 'user', content: 'hi' }],
            max_tokens: 1,
          }),
        });
        if (res.ok || res.status === 429) {
          return { status: 'available', provider: this.config.name, latency: Date.now() - start };
        }
        return { status: `error_${res.status}`, provider: this.config.name, latency: -1 };
      } else {
        const res = await fetch(`${this.config.baseUrl}/models`, {
          headers: { Authorization: `Bearer ${this.config.apiKey}` },
        });
        if (res.ok) {
          return { status: 'available', provider: this.config.name, latency: Date.now() - start };
        }
        return { status: `error_${res.status}`, provider: this.config.name, latency: -1 };
      }
    } catch (error: unknown) {
      return { status: 'unreachable', provider: this.config.name, latency: -1 };
    }
  }

  /**
   * 快速单轮问答（非流式，用于快捷命令）
   */
  async quickAsk(prompt: string, maxTokens = 500): Promise<string> {
    if (!this.config.apiKey) {
      throw new Error('AI API Key 未配置');
    }

    if (this.provider === 'anthropic') {
      const res = await fetch(`${this.config.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => 'unknown error');
        throw new Error(`API ${res.status}: ${errorText}`);
      }

      const data = await res.json() as Record<string, unknown>;
      const content = data.content as Array<Record<string, unknown>> | undefined;
      if (content && content.length > 0 && typeof content[0].text === 'string') {
        return content[0].text;
      }
      return '';
    } else {
      const res = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => 'unknown error');
        throw new Error(`API ${res.status}: ${errorText}`);
      }

      const data = await res.json() as Record<string, unknown>;
      const choices = data.choices as Array<Record<string, unknown>> | undefined;
      if (choices && choices.length > 0) {
        const message = choices[0].message as Record<string, unknown> | undefined;
        if (message && typeof message.content === 'string') {
          return message.content;
        }
      }
      return '';
    }
  }

  /**
   * 流式对话（完整版，内部处理工具调用循环）
   */
  async *chatStreamWithTools(
    messages: LlmMessage[],
    tools: LlmTool[],
    toolExecutor: (name: string, input: Record<string, unknown>) => Promise<string>,
  ): AsyncGenerator<StreamChunk> {
    if (!this.config.apiKey) {
      yield { type: 'error', message: 'AI API Key 未配置，请在 .env 中设置' };
      return;
    }

    let currentMessages = [...messages];
    let iteration = 0;
    const MAX_ITERATIONS = 5;

    while (iteration < MAX_ITERATIONS) {
      iteration++;
      this.logger.debug(`LLM 调用 #${iteration}, provider=${this.provider}`);

      const stream = this.provider === 'anthropic'
        ? this.streamAnthropic(currentMessages, tools)
        : this.streamOpenAI(currentMessages, tools);

      let textBuffer = '';
      const toolUses: { id: string; name: string; input: Record<string, unknown> }[] = [];
      let stopReason = '';

      for await (const chunk of stream) {
        switch (chunk.type) {
          case 'token':
            textBuffer += chunk.content;
            yield chunk;
            break;
          case 'tool_use':
            toolUses.push({ id: chunk.id, name: chunk.name, input: chunk.input });
            break;
          case 'done':
            stopReason = chunk.stopReason;
            break;
          case 'error':
            yield chunk;
            return;
        }
      }

      if (stopReason === 'tool_use' && toolUses.length > 0) {
        // 构造 assistant 消息（包含 text + tool_use blocks）
        const assistantContent: LlmContentBlock[] = [];
        if (textBuffer) assistantContent.push({ type: 'text', text: textBuffer });
        for (const tu of toolUses) {
          assistantContent.push({ type: 'tool_use', id: tu.id, name: tu.name, input: tu.input });
        }

        // 执行工具（带 SSE 通知）
        const toolResults: LlmContentBlock[] = [];
        for (const tu of toolUses) {
          yield { type: 'tool_call', tool: tu.name, status: 'running', params: tu.input };
          try {
            const result = await toolExecutor(tu.name, tu.input);
            toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: result });
            yield { type: 'tool_call', tool: tu.name, status: 'complete', result: result.slice(0, 200) };
          } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: `错误: ${msg}` });
            yield { type: 'tool_call', tool: tu.name, status: 'error', result: msg };
          }
        }

        currentMessages = [
          ...currentMessages,
          { role: 'assistant', content: assistantContent },
          { role: 'user', content: toolResults },
        ];

        continue; // 继续下一轮 LLM 调用
      }

      yield { type: 'done', stopReason: stopReason || 'end_turn' };
      return;
    }

    yield { type: 'error', message: '工具调用次数超过限制（最多 5 次）' };
  }

  /* ═══════════════════════════════════════════════════════════════
     Anthropic Messages API (Kimi Coding)
     ═══════════════════════════════════════════════════════════════ */

  private async *streamAnthropic(messages: LlmMessage[], tools?: LlmTool[]): AsyncGenerator<StreamChunk> {
    const anthropicMessages = messages.map((m) => ({
      role: m.role,
      content: typeof m.content === 'string'
        ? m.content
        : m.content.map((c) => {
            if (c.type === 'text') return { type: 'text' as const, text: c.text ?? '' };
            if (c.type === 'tool_use') return { type: 'tool_use' as const, id: c.id, name: c.name, input: c.input };
            if (c.type === 'tool_result') return { type: 'tool_result' as const, tool_use_id: c.tool_use_id, content: c.content };
            return { type: 'text' as const, text: '' };
          }),
    }));

    const body: Record<string, unknown> = {
      model: this.config.model,
      messages: anthropicMessages,
      max_tokens: this.config.maxTokens,
      stream: true,
    };

    if (tools && tools.length > 0) {
      body.tools = tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema,
      }));
    }

    const res = await fetch(`${this.config.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'unknown error');
      yield { type: 'error', message: `API ${res.status}: ${errorText}` };
      return;
    }

    if (!res.body) {
      yield { type: 'error', message: 'API 返回空响应体' };
      return;
    }

    const reader = res.body.getReader();
    let currentTool: { id: string; name: string; inputJson: string } | null = null;

    for await (const { event, data } of parseSse(reader)) {
      switch (event) {
        case 'content_block_start': {
          const d = data as Record<string, unknown>;
          const block = d.content_block as Record<string, unknown> | undefined;
          if (block?.type === 'tool_use') {
            currentTool = {
              id: String(block.id ?? ''),
              name: String(block.name ?? ''),
              inputJson: '',
            };
          }
          break;
        }

        case 'content_block_delta': {
          const d = data as Record<string, unknown>;
          const delta = d.delta as Record<string, unknown> | undefined;
          if (delta?.type === 'text_delta') {
            yield { type: 'token', content: String(delta.text ?? '') };
          } else if (delta?.type === 'input_json_delta') {
            if (currentTool) {
              currentTool.inputJson += String(delta.partial_json ?? '');
            }
          }
          break;
        }

        case 'content_block_stop': {
          if (currentTool) {
            try {
              const input = JSON.parse(currentTool.inputJson || '{}');
              yield { type: 'tool_use', id: currentTool.id, name: currentTool.name, input };
            } catch {
              yield { type: 'tool_use', id: currentTool.id, name: currentTool.name, input: {} };
            }
            currentTool = null;
          }
          break;
        }

        case 'message_delta': {
          const d = data as Record<string, unknown>;
          const delta = d.delta as Record<string, unknown> | undefined;
          const stopReason = String(delta?.stop_reason ?? 'end_turn');
          yield { type: 'done', stopReason };
          break;
        }
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     OpenAI Chat Completions API (DeepSeek / Moonshot / OpenAI)
     ═══════════════════════════════════════════════════════════════ */

  private async *streamOpenAI(messages: LlmMessage[], tools?: LlmTool[]): AsyncGenerator<StreamChunk> {
    // 简化消息为纯字符串（OpenAI 不支持复杂 content blocks）
    const openaiMessages = messages.map((m) => {
      if (typeof m.content === 'string') {
        return { role: m.role, content: m.content };
      }
      // 复杂 content 转为 JSON 字符串
      return { role: m.role, content: JSON.stringify(m.content) };
    });

    const body: Record<string, unknown> = {
      model: this.config.model,
      messages: openaiMessages,
      max_tokens: this.config.maxTokens,
      stream: true,
    };

    if (tools && tools.length > 0) {
      body.tools = tools.map((t) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.input_schema,
        },
      }));
      body.tool_choice = 'auto';
    }

    const res = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'unknown error');
      yield { type: 'error', message: `API ${res.status}: ${errorText}` };
      return;
    }

    if (!res.body) {
      yield { type: 'error', message: 'API 返回空响应体' };
      return;
    }

    const reader = res.body.getReader();
    // OpenAI tool_calls 是数组，按 index 索引
    const toolCalls: Map<number, { id: string; name: string; args: string }> = new Map();

    for await (const { data } of parseSse(reader)) {
      if (typeof data === 'object' && data !== null && '__done' in data) continue;

      const d = data as Record<string, unknown> | undefined;
      if (!d) continue;

      const choices = d.choices as Array<Record<string, unknown>> | undefined;
      if (!choices || choices.length === 0) continue;

      const delta = choices[0].delta as Record<string, unknown> | undefined;
      if (!delta) continue;

      // 文本 token
      if (typeof delta.content === 'string' && delta.content) {
        yield { type: 'token', content: delta.content };
      }

      // tool_calls
      const tcArray = delta.tool_calls as Array<Record<string, unknown>> | undefined;
      if (tcArray) {
        for (const tc of tcArray) {
          const index = Number(tc.index ?? 0);
          if (!toolCalls.has(index)) {
            toolCalls.set(index, {
              id: String(tc.id ?? ''),
              name: String((tc.function as Record<string, unknown>)?.name ?? ''),
              args: '',
            });
          }
          const existing = toolCalls.get(index)!;
          const func = tc.function as Record<string, unknown> | undefined;
          if (func?.name) existing.name = String(func.name);
          if (func?.arguments) existing.args += String(func.arguments);
        }
      }

      // finish_reason
      const finishReason = choices[0].finish_reason as string | undefined;
      if (finishReason) {
        // 输出已收集的 tool_calls
        if (finishReason === 'tool_calls') {
          for (const tc of toolCalls.values()) {
            try {
              const input = JSON.parse(tc.args || '{}');
              yield { type: 'tool_use', id: tc.id, name: tc.name, input };
            } catch {
              yield { type: 'tool_use', id: tc.id, name: tc.name, input: {} };
            }
          }
        }
        yield { type: 'done', stopReason: finishReason === 'tool_calls' ? 'tool_use' : finishReason };
      }
    }
  }
}
