import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { LlmService } from './llm.service';
import { AiToolsService } from './ai-tools.service';
import { AiConversationService } from './ai-conversation.service';
import { AiQuickService } from './ai-quick.service';
import { SharedModule } from '../../shared/shared.module';

/**
 * AI 模块（直连 LLM API）
 * 支持 Kimi Coding（Anthropic Messages API）和 OpenAI 兼容格式
 * 通过 Function Calling 查询 ResearchOS 内部数据
 * Phase 3: 新增对话持久化 + 快捷命令
 */
@Module({
  imports: [SharedModule],
  controllers: [AiController],
  providers: [LlmService, AiToolsService, AiConversationService, AiQuickService],
})
export class AiModule {}
