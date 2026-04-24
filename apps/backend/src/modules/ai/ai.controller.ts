import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  Param,
  Patch,
  Delete,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LlmService, LlmMessage } from './llm.service';
import { AiToolsService, PHD_OS_TOOLS } from './ai-tools.service';
import { AiConversationService } from './ai-conversation.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { QuickCommandDto } from './dto/quick-command.dto';
import { AiQuickService } from './ai-quick.service';

@ApiTags('AI Assistant')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly aiToolsService: AiToolsService,
    private readonly conversationService: AiConversationService,
    private readonly aiQuickService: AiQuickService,
  ) {}

  /* ═══════════════════════════════════════════════════════════════
     对话管理 CRUD
     ═══════════════════════════════════════════════════════════════ */

  @Post('conversations')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '创建新对话' })
  async createConversation(@Req() req, @Body('title') title?: string) {
    const userId = req.user.id as string;
    return this.conversationService.create(userId, title);
  }

  @Get('conversations')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取对话列表' })
  async listConversations(@Req() req) {
    const userId = req.user.id as string;
    const conversations = await this.conversationService.findAll(userId);
    return conversations.map((c) => ({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      messageCount: c._count.messages,
    }));
  }

  @Get('conversations/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取对话详情（含消息）' })
  async getConversation(@Req() req, @Param('id') id: string) {
    const userId = req.user.id as string;
    const conversation = await this.conversationService.findOne(userId, id);
    return {
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      messages: conversation.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        toolCalls: m.toolCalls,
        createdAt: m.createdAt,
      })),
    };
  }

  @Patch('conversations/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '更新对话标题' })
  async updateConversationTitle(
    @Req() req,
    @Param('id') id: string,
    @Body('title') title: string,
  ) {
    const userId = req.user.id as string;
    return this.conversationService.updateTitle(userId, id, title);
  }

  @Delete('conversations/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除对话' })
  async deleteConversation(@Req() req, @Param('id') id: string) {
    const userId = req.user.id as string;
    await this.conversationService.remove(userId, id);
  }

  /* ═══════════════════════════════════════════════════════════════
     SSE 流式对话（支持工具调用 + 对话持久化）
     ═══════════════════════════════════════════════════════════════ */

  @Post('chat')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'AI 对话（SSE 流式，支持工具调用 + 多轮持久化）' })
  async chat(@Body() dto: ChatRequestDto, @Req() req, @Res() res: Response) {
    const userId = req.user.id as string;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      // ── 1. 确定/创建对话 ──
      let conversationId = dto.conversationId;
      if (!conversationId) {
        const conv = await this.conversationService.create(
          userId,
          dto.message.slice(0, 30),
        );
        conversationId = conv.id;

        // 发送 conversation_id 事件，让前端知道新对话 ID
        res.write(
          `data: ${JSON.stringify({ type: 'conversation_id', conversationId }) }\n\n`,
        );
      }

      // ── 2. 保存用户消息 ──
      await this.conversationService.saveUserMessage(
        conversationId,
        dto.message,
      );

      // ── 3. 加载历史消息（最近 20 条，用于 LLM 上下文）─
      const history = await this.conversationService.loadHistory(
        conversationId,
        20,
      );

      // ── 4. 构建系统提示 ──
      const systemPrompt = `你是 PhD_AI，一位专业的科研助手。你可以帮助用户管理科研任务、查看日程安排、分析番茄钟专注数据、管理文献和笔记。

当前日期: ${new Date().toLocaleDateString('zh-CN')}

你拥有以下工具来查询用户的真实数据：
- get_tasks: 查询任务列表
- get_calendar_events: 查询日程事件
- get_pomodoro_stats: 查询番茄钟统计数据
- get_today_summary: 获取今日综合概览
- get_notes: 获取笔记列表
- search_notes: 搜索笔记内容（标题+正文+摘要+标签）
- get_note_detail: 获取单篇笔记完整内容
- create_note: 创建新笔记
- update_note: 更新或追加现有笔记内容
- get_references: 获取文献列表
- search_references: 搜索文献
- get_reference_detail: 获取文献详情
- create_reference: 创建文献
- import_reference_by_doi: 通过 DOI 导入文献
- create_task: 创建任务

回答时请注意：
1. 用简洁、专业的中文回复
2. 如果数据为空，如实告知
3. 可以基于用户的笔记内容给出研究建议或总结
4. 可以给出时间管理建议`;

      // 构建 LLM messages 数组（system → history → current user）
      const messages: LlmMessage[] = [
        { role: 'user', content: systemPrompt },
        ...history.map((m) => ({
          role: m.role.toLowerCase() as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user', content: dto.message },
      ];

      // ── 5. 流式对话（内部自动处理工具调用循环）─
      const stream = this.llmService.chatStreamWithTools(
        messages,
        PHD_OS_TOOLS,
        (name, input) => this.aiToolsService.execute(name, input, userId),
      );

      // ── 6. 收集助手回复并实时 SSE 发送 ──
      let assistantContent = '';
      const assistantToolCalls: Array<{
        tool: string;
        status: 'running' | 'complete' | 'error';
        params?: Record<string, unknown>;
        result?: string;
      }> = [];

      for await (const chunk of stream) {
        if (chunk.type === 'token') {
          assistantContent += chunk.content;
          res.write(
            `data: ${JSON.stringify({ type: 'token', content: chunk.content })}\n\n`,
          );
        } else if (chunk.type === 'tool_call') {
          // 转发工具调用状态事件（LlmService 内部已执行工具）
          assistantToolCalls.push({
            tool: chunk.tool,
            status: chunk.status,
            params: chunk.params,
            result: chunk.result,
          });
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        } else if (chunk.type === 'done') {
          // 流结束，保存助手消息
          await this.conversationService.saveAssistantMessage(
            conversationId,
            assistantContent,
            assistantToolCalls.length > 0 ? assistantToolCalls : undefined,
          );
          await this.conversationService.touch(conversationId);

          res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
          res.end();
          return;
        } else if (chunk.type === 'error') {
          res.write(
            `data: ${JSON.stringify({ type: 'error', message: chunk.message })}\n\n`,
          );
          res.end();
          return;
        }
      }

      // 保险：如果 stream 正常结束但没有 done，手动发送
      if (assistantContent) {
        await this.conversationService.saveAssistantMessage(
          conversationId,
          assistantContent,
          assistantToolCalls.length > 0 ? assistantToolCalls : undefined,
        );
        await this.conversationService.touch(conversationId);
      }
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`AI chat error: ${msg}`);
      res.write(`data: ${JSON.stringify({ type: 'error', message: msg })}\n\n`);
      res.end();
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     快捷命令（直接 LLM，非流式）
     ═══════════════════════════════════════════════════════════════ */

  @Post('quick')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'AI 快捷命令（翻译/润色/摘要，直接返回）' })
  async quick(@Body() dto: QuickCommandDto) {
    let result: string;

    switch (dto.command) {
      case 'translate':
        result = await this.aiQuickService.translate(dto.text, dto.targetLang);
        break;
      case 'polish':
        result = await this.aiQuickService.polish(dto.text);
        break;
      case 'summarize':
        result = await this.aiQuickService.summarize(dto.text, dto.maxLength);
        break;
      default:
        result = '未知命令';
    }

    return { result };
  }

  @Get('health')
  @ApiOperation({ summary: 'AI 服务健康检查' })
  async health() {
    return this.llmService.healthCheck();
  }
}
