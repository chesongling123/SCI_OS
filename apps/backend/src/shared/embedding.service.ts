import { Injectable, Logger } from '@nestjs/common';

/**
 * 豆包 Embedding API 封装
 * 支持文本向量化，用于语义检索（RAG）
 * 模型: doubao-embedding-vision-251215, 维度: 1024
 */
@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly dimensions: number;
  private readonly enabled: boolean;

  constructor() {
    this.apiKey = process.env.DOUBAO_EMBEDDING_API_KEY ?? '';
    this.baseUrl = (process.env.DOUBAO_EMBEDDING_BASE_URL ?? 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/$/, '');
    this.model = process.env.DOUBAO_EMBEDDING_MODEL ?? 'doubao-embedding-vision-251215';
    this.dimensions = Number(process.env.DOUBAO_EMBEDDING_DIMENSIONS ?? '1024');
    this.enabled = !!this.apiKey;

    if (!this.enabled) {
      this.logger.warn('豆包 Embedding API Key 未配置，语义检索功能将不可用');
    } else {
      this.logger.log(`Embedding 服务已初始化: model=${this.model}, dimensions=${this.dimensions}`);
    }
  }

  /**
   * 单条文本向量化
   */
  async embedText(text: string): Promise<number[] | null> {
    if (!this.enabled) return null;
    const results = await this.embedTexts([text]);
    return results?.[0] ?? null;
  }

  /**
   * 批量文本向量化（最多 32 条/批）
   */
  async embedTexts(texts: string[]): Promise<(number[] | null)[]> {
    if (!this.enabled) {
      this.logger.debug('Embedding 服务未启用，跳过向量化');
      return texts.map(() => null);
    }

    const validTexts = texts.map((t) => t.trim()).filter((t) => t.length > 0);
    if (validTexts.length === 0) {
      return texts.map(() => null);
    }

    const BATCH_SIZE = 32;
    const results: (number[] | null)[] = [];

    for (let i = 0; i < validTexts.length; i += BATCH_SIZE) {
      const batch = validTexts.slice(i, i + BATCH_SIZE);
      try {
        const batchResults = await this.callEmbeddingApi(batch);
        results.push(...batchResults);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Embedding API 批量调用失败: ${msg}`);
        // 失败时该批次全部返回 null
        results.push(...batch.map(() => null));
      }
    }

    // 如果原始 texts 包含空字符串，需要补回对应位置
    let resultIndex = 0;
    return texts.map((t) => {
      if (t.trim().length === 0) return null;
      return results[resultIndex++] ?? null;
    });
  }

  /**
   * 检查 Embedding 服务可用性
   */
  async healthCheck(): Promise<{ status: string; latency: number }> {
    if (!this.enabled) {
      return { status: 'no_key', latency: -1 };
    }
    const start = Date.now();
    try {
      await this.embedText('test');
      return { status: 'available', latency: Date.now() - start };
    } catch {
      return { status: 'error', latency: -1 };
    }
  }

  private async callEmbeddingApi(texts: string[]): Promise<(number[] | null)[]> {
    const input = texts.map((text) => ({
      type: 'text' as const,
      text,
    }));

    const res = await fetch(`${this.baseUrl}/embeddings/multimodal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input,
        dimensions: this.dimensions,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'unknown error');
      throw new Error(`Embedding API ${res.status}: ${errorText}`);
    }

    const data = (await res.json()) as {
      data?: Array<{ embedding?: number[]; index?: number }>;
      error?: { message?: string };
    };

    if (data.error) {
      throw new Error(`Embedding API 错误: ${data.error.message ?? 'unknown'}`);
    }

    const embeddings = data.data ?? [];
    // 按 index 排序后返回
    const sorted = [...embeddings].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    return sorted.map((item) => item.embedding ?? null);
  }
}
