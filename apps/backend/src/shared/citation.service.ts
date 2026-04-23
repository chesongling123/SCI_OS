import { Injectable } from '@nestjs/common';

export type CitationFormat = 'bibtex' | 'gb7714' | 'apa' | 'mla' | 'chicago';

/**
 * 引用格式化服务
 * 纯本地模板转换，无需外部 API
 */
@Injectable()
export class CitationService {
  /**
   * 生成指定格式的引用文本
   */
  format(
    data: {
      title: string;
      authors: string[];
      year?: number | null;
      journal?: string | null;
      volume?: string | null;
      issue?: string | null;
      pages?: string | null;
      doi?: string | null;
    },
    format: CitationFormat,
  ): string {
    switch (format) {
      case 'bibtex':
        return this.toBibTeX(data);
      case 'gb7714':
        return this.toGB7714(data);
      case 'apa':
        return this.toAPA(data);
      case 'mla':
        return this.toMLA(data);
      case 'chicago':
        return this.toChicago(data);
      default:
        return this.toGB7714(data);
    }
  }

  private toBibTeX(data: {
    title: string;
    authors: string[];
    year?: number | null;
    journal?: string | null;
    volume?: string | null;
    issue?: string | null;
    pages?: string | null;
    doi?: string | null;
  }): string {
    const key = this.citeKey(data);
    const lines = [`@article{${key},`];
    lines.push(`  title={${this.escapeBibTeX(data.title)}},`);
    if (data.authors.length > 0) {
      lines.push(`  author={${data.authors.join(' and ')}},`);
    }
    if (data.journal) {
      lines.push(`  journal={${this.escapeBibTeX(data.journal)}},`);
    }
    if (data.year) {
      lines.push(`  year={${data.year}},`);
    }
    if (data.volume) {
      lines.push(`  volume={${data.volume}},`);
    }
    if (data.issue) {
      lines.push(`  number={${data.issue}},`);
    }
    if (data.pages) {
      lines.push(`  pages={${data.pages}},`);
    }
    if (data.doi) {
      lines.push(`  doi={${data.doi}},`);
    }
    lines.push('}');
    return lines.join('\n');
  }

  private toGB7714(data: {
    title: string;
    authors: string[];
    year?: number | null;
    journal?: string | null;
    volume?: string | null;
    issue?: string | null;
    pages?: string | null;
    doi?: string | null;
  }): string {
    // GB/T 7714-2015 格式：作者. 标题[J]. 期刊, 年, 卷(期): 页码.
    const authorStr = this.formatAuthorsGB7714(data.authors);
    const parts: string[] = [];
    if (authorStr) parts.push(authorStr);
    parts.push(`${data.title}[J]`);
    if (data.journal) parts.push(data.journal);
    if (data.year) {
      let yearPart = `${data.year}`;
      if (data.volume) {
        yearPart += `, ${data.volume}`;
        if (data.issue) yearPart += `(${data.issue})`;
      }
      parts.push(yearPart);
    }
    if (data.pages) parts.push(`${data.pages}.`);
    else parts.push('.');
    return parts.join('. ');
  }

  private toAPA(data: {
    title: string;
    authors: string[];
    year?: number | null;
    journal?: string | null;
    volume?: string | null;
    issue?: string | null;
    pages?: string | null;
    doi?: string | null;
  }): string {
    const authorStr = this.formatAuthorsAPA(data.authors);
    const parts: string[] = [];
    if (authorStr) parts.push(authorStr);
    if (data.year) parts.push(`(${data.year})`);
    parts.push(data.title);
    if (data.journal) {
      let journalPart = `*${data.journal}*`;
      if (data.volume) {
        journalPart += `, *${data.volume}*`;
        if (data.issue) journalPart += `(${data.issue})`;
      }
      if (data.pages) journalPart += `, ${data.pages}`;
      parts.push(journalPart);
    }
    if (data.doi) parts.push(`https://doi.org/${data.doi}`);
    return parts.join('. ');
  }

  private toMLA(data: {
    title: string;
    authors: string[];
    year?: number | null;
    journal?: string | null;
    volume?: string | null;
    issue?: string | null;
    pages?: string | null;
    doi?: string | null;
  }): string {
    const authorStr = this.formatAuthorsMLA(data.authors);
    const parts: string[] = [];
    if (authorStr) parts.push(authorStr);
    parts.push(`"${data.title}."`);
    if (data.journal) {
      let journalPart = `*${data.journal}*`;
      if (data.volume) {
        journalPart += ` vol. ${data.volume}`;
        if (data.issue) journalPart += `, no. ${data.issue}`;
      }
      if (data.year) journalPart += `, ${data.year}`;
      if (data.pages) journalPart += `, pp. ${data.pages}`;
      parts.push(journalPart);
    }
    if (data.doi) parts.push(`doi:${data.doi}.`);
    else parts.push('.');
    return parts.join(', ');
  }

  /* ═══════════════════════════════════════════════════════════════
     辅助方法
     ═══════════════════════════════════════════════════════════════ */

  private citeKey(data: { title: string; authors: string[]; year?: number | null }): string {
    const firstAuthor = data.authors[0] ?? 'unknown';
    const family = firstAuthor.split(' ')[0] ?? 'unknown';
    const year = data.year ?? 'n.d';
    const titleWord = data.title.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    return `${family}${year}${titleWord}`.slice(0, 30);
  }

  private escapeBibTeX(text: string): string {
    return text
      .replace(/\\/g, '\\textbackslash{}')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/\$/g, '\\$')
      .replace(/&/g, '\\&')
      .replace(/#/g, '\\#')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_')
      .replace(/~/g, '\\textasciitilde{}')
      .replace(/\^/g, '\\textasciicircum{}');
  }

  private formatAuthorsGB7714(authors: string[]): string {
    if (authors.length === 0) return '';
    if (authors.length <= 3) return authors.join(', ');
    return `${authors[0]}, 等`;
  }

  private formatAuthorsAPA(authors: string[]): string {
    if (authors.length === 0) return '';
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return `${authors[0]} & ${authors[1]}`;
    return `${authors[0]} et al.`;
  }

  private formatAuthorsMLA(authors: string[]): string {
    if (authors.length === 0) return '';
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return `${authors[0]}, and ${authors[1]}`;
    return `${authors[0]}, et al.`;
  }

  private toChicago(data: {
    title: string;
    authors: string[];
    year?: number | null;
    journal?: string | null;
    volume?: string | null;
    issue?: string | null;
    pages?: string | null;
    doi?: string | null;
  }): string {
    const authorStr = this.formatAuthorsChicago(data.authors);
    const parts: string[] = [];
    if (authorStr) parts.push(authorStr);
    parts.push(`"${data.title}."`);
    if (data.journal) {
      let journalPart = `*${data.journal}*`;
      if (data.volume) {
        journalPart += ` ${data.volume}`;
        if (data.issue) journalPart += `, no. ${data.issue}`;
      }
      if (data.year) journalPart += ` (${data.year})`;
      if (data.pages) journalPart += `: ${data.pages}`;
      parts.push(journalPart);
    }
    if (data.doi) parts.push(`https://doi.org/${data.doi}.`);
    else parts.push('.');
    return parts.join(' ');
  }

  private formatAuthorsChicago(authors: string[]): string {
    if (authors.length === 0) return '';
    if (authors.length === 1) return authors[0] + '.';
    if (authors.length === 2) return `${authors[0]} and ${authors[1]}.`;
    return `${authors[0]} et al.`;
  }
}
