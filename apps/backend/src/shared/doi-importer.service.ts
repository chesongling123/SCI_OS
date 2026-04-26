import { Injectable, Logger, BadRequestException } from '@nestjs/common';

/**
 * CrossRef DOI 导入服务
 * 免费 API，无需 Key。建议请求时携带 User-Agent 和 mailto。
 */
@Injectable()
export class DoiImporterService {
  private readonly logger = new Logger(DoiImporterService.name);
  private readonly baseUrl = 'https://api.crossref.org/works';

  /**
   * 通过 DOI 获取文献元数据
   */
  async fetchByDoi(doi: string): Promise<{
    title: string;
    authors: string[];
    year?: number;
    journal?: string;
    volume?: string;
    issue?: string;
    pages?: string;
    doi: string;
    url?: string;
    abstract?: string;
    keywords: string[];
  }> {
    const cleanDoi = doi.trim();
    if (!cleanDoi) {
      throw new BadRequestException('DOI 不能为空');
    }

    const url = `${this.baseUrl}/${encodeURIComponent(cleanDoi)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'ResearchOS/1.0 (mailto:research-os@example.com)',
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      if (res.status === 404) {
        throw new BadRequestException(`DOI 未找到: ${cleanDoi}`);
      }
      const text = await res.text().catch(() => 'unknown');
      throw new BadRequestException(`CrossRef API 错误 (${res.status}): ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as CrossRefResponse;
    const msg = json.message;

    if (!msg) {
      throw new BadRequestException('CrossRef 返回数据格式异常');
    }

    return {
      title: this.extractTitle(msg),
      authors: this.extractAuthors(msg),
      year: this.extractYear(msg),
      journal: this.extractJournal(msg),
      volume: msg.volume ?? undefined,
      issue: msg.issue ?? undefined,
      pages: msg.page ?? undefined,
      doi: msg.DOI ?? cleanDoi,
      url: msg.URL ?? `https://doi.org/${cleanDoi}`,
      abstract: msg.abstract ?? undefined,
      keywords: msg.subject ?? [],
    };
  }

  private extractTitle(msg: CrossRefMessage): string {
    if (Array.isArray(msg.title) && msg.title.length > 0) {
      return msg.title[0];
    }
    return '未知标题';
  }

  private extractAuthors(msg: CrossRefMessage): string[] {
    if (!Array.isArray(msg.author)) return [];
    return msg.author
      .map((a) => {
        const given = a.given ?? '';
        const family = a.family ?? '';
        if (family && given) return `${family} ${given}`;
        return family || given || '';
      })
      .filter(Boolean);
  }

  private extractYear(msg: CrossRefMessage): number | undefined {
    const parts = msg['published-print']?.['date-parts']?.[0]
      ?? msg['published-online']?.['date-parts']?.[0]
      ?? msg.created?.['date-parts']?.[0];
    if (parts && parts.length > 0) {
      const y = Number(parts[0]);
      if (!isNaN(y) && y > 1000) return y;
    }
    return undefined;
  }

  private extractJournal(msg: CrossRefMessage): string | undefined {
    if (Array.isArray(msg['container-title']) && msg['container-title'].length > 0) {
      return msg['container-title'][0];
    }
    if (Array.isArray(msg['short-container-title']) && msg['short-container-title'].length > 0) {
      return msg['short-container-title'][0];
    }
    return undefined;
  }
}

/* ═══════════════════════════════════════════════════════════════
   CrossRef API 响应类型定义
   ═══════════════════════════════════════════════════════════════ */

interface CrossRefResponse {
  status: string;
  message?: CrossRefMessage;
}

interface CrossRefMessage {
  title?: string[];
  author?: Array<{ given?: string; family?: string }>;
  'published-print'?: { 'date-parts'?: number[][] };
  'published-online'?: { 'date-parts'?: number[][] };
  created?: { 'date-parts'?: number[][] };
  'container-title'?: string[];
  'short-container-title'?: string[];
  volume?: string;
  issue?: string;
  page?: string;
  DOI?: string;
  URL?: string;
  abstract?: string;
  subject?: string[];
}
