import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from './llm.service';

@Injectable()
export class AiQuickService {
  private readonly logger = new Logger(AiQuickService.name);

  constructor(private readonly llmService: LlmService) {}

  /**
   * 翻译文本
   */
  async translate(text: string, targetLang = '中文'): Promise<string> {
    const prompt = `将以下文本翻译成${targetLang}，只返回翻译结果，不要添加任何解释、注释或原文：

${text}`;
    return this.llmService.quickAsk(prompt, 800);
  }

  /**
   * 润色文本
   */
  async polish(text: string): Promise<string> {
    const prompt = `润色以下文本，保持原意但使表达更专业、流畅、学术化。只返回润色后的文本，不要添加解释：

${text}`;
    return this.llmService.quickAsk(prompt, 800);
  }

  /**
   * 生成摘要
   */
  async summarize(text: string, maxLength = 200): Promise<string> {
    const prompt = `总结以下文本的核心要点，限制在${maxLength}字以内。只返回摘要内容，不要添加标题或解释：

${text}`;
    return this.llmService.quickAsk(prompt, 600);
  }
}
