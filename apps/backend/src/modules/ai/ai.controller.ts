import { Controller, Post, Get, Body, Res, Req, UseGuards, Logger } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LlmService, LlmMessage } from './llm.service';
import { AiToolsService, PHD_OS_TOOLS } from './ai-tools.service';
import { ChatRequestDto } from './dto/chat-request.dto';

@ApiTags('AI Assistant')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly aiToolsService: AiToolsService,
  ) {}

  @Post('chat')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'AI 对话（SSE 流式，支持工具调用）' })
  async chat(@Body() dto: ChatRequestDto, @Req() req, @Res() res: Response) {
    const userId = req.user.id as string;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      // 构建系统提示 + 用户消息
      const systemPrompt = `你是 PhD_AI，一位专业的科研助手。你可以帮助用户管理科研任务、查看日程安排、分析番茄钟专注数据。

当前日期: ${new Date().toLocaleDateString('zh-CN')}

你拥有以下工具来查询用户的真实数据：
- get_tasks: 查询任务列表
- get_calendar_events: 查询日程事件
- get_pomodoro_stats: 查询番茄钟统计数据
- get_today_summary: 获取今日综合概览

回答时请注意：
1. 用简洁、专业的中文回复
2. 如果数据为空，如实告知
3. 可以给出时间管理建议`;

      const messages: LlmMessage[] = [
        { role: 'user', content: `${systemPrompt}\n\n用户问题: ${dto.message}` },
      ];

      // 流式对话（内部自动处理工具调用循环）
      const stream = this.llmService.chatStreamWithTools(
        messages,
        PHD_OS_TOOLS,
        (name, input) => this.aiToolsService.execute(name, input, userId),
      );

      for await (const chunk of stream) {
        if (chunk.type === 'token') {
          res.write(`data: ${JSON.stringify({ type: 'token', content: chunk.content }) }\n\n`);
        } else if (chunk.type === 'done') {
          res.write(`data: ${JSON.stringify({ type: 'done' }) }\n\n`);
          res.end();
          return;
        } else if (chunk.type === 'error') {
          res.write(`data: ${JSON.stringify({ type: 'error', message: chunk.message }) }\n\n`);
          res.end();
          return;
        }
      }

      // 保险：如果 stream 正常结束但没有 done，手动发送
      res.write(`data: ${JSON.stringify({ type: 'done' }) }\n\n`);
      res.end();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`AI chat error: ${msg}`);
      res.write(`data: ${JSON.stringify({ type: 'error', message: msg }) }\n\n`);
      res.end();
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'AI 服务健康检查' })
  async health() {
    return this.llmService.healthCheck();
  }

}
