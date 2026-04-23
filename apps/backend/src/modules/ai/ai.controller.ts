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
- get_notes: 获取笔记列表
- search_notes: 搜索笔记内容（标题+正文+摘要+标签）
- get_note_detail: 获取单篇笔记完整内容
- create_note: 创建新笔记，将重要信息保存到笔记库
- update_note: 更新或追加现有笔记内容

关于笔记操作：
- 当用户要求「记下来」「保存到笔记」「记录一下」时，使用 create_note
- 当用户要求「更新笔记」「追加到笔记」时，先 search_notes 找到笔记，再用 update_note
- create_note 和 update_note 的 content 支持 Markdown 格式，我会自动转换
- 创建笔记时，请使用 Markdown 格式来组织内容：用 ## 表示小标题、- 表示列表项、**文字**表示加粗、*文字*表示斜体、\`代码\`表示行内代码、\`\`\`包裹代码块、- [ ] 表示任务项。这样笔记在编辑器中会正确显示格式

回答时请注意：
1. 用简洁、专业的中文回复
2. 如果数据为空，如实告知
3. 可以基于用户的笔记内容给出研究建议或总结
4. 可以给出时间管理建议
5. 创建/更新笔记后，告诉用户操作已成功`;

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
