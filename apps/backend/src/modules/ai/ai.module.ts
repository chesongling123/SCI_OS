import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { LlmService } from './llm.service';
import { AiToolsService } from './ai-tools.service';
import { AiConversationService } from './ai-conversation.service';
import { AiQuickService } from './ai-quick.service';
import { ProactiveController } from './proactive/proactive.controller';
import { ProactiveService } from './proactive/proactive.service';
import { SharedModule } from '../../shared/shared.module';

/**
 * AI 模块（直连 LLM API）
 * 支持 Kimi Coding（Anthropic Messages API）和 OpenAI 兼容格式
 * 通过 Function Calling 查询 ResearchOS 内部数据
 * Phase 3: 新增对话持久化 + 快捷命令
 * Phase 3.5: 新增主动建议子系统
 */
@Module({
  imports: [SharedModule],
  controllers: [AiController, ProactiveController],
  providers: [LlmService, AiToolsService, AiConversationService, AiQuickService, ProactiveService],
})
export class AiModule {}
