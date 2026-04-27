import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { ProactiveService } from './proactive.service';

/**
 * 主动建议 API
 * 提供：手动触发、查询待展示、反馈、统计
 */
@ApiTags('AI Proactive')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai/suggestions')
export class ProactiveController {
  private readonly logger = new Logger(ProactiveController.name);

  constructor(private readonly proactiveService: ProactiveService) {}

  @Post('generate')
  @ApiOperation({ summary: '手动触发建议生成（调试用）' })
  async generate(@Req() req: { user: { id: string } }) {
    const userId = req.user.id;
    const suggestion = await this.proactiveService.generateSuggestion(userId);
    return { generated: !!suggestion, suggestion };
  }

  @Get()
  @ApiOperation({ summary: '获取待展示的建议列表' })
  async getPending(
    @Req() req: { user: { id: string } },
    @Query('limit') limit?: string,
  ) {
    const userId = req.user.id;
    const suggestions = await this.proactiveService.getPendingSuggestions(
      userId,
      limit ? parseInt(limit, 10) : 20,
    );
    return { data: suggestions };
  }

  @Post(':id/feedback')
  @ApiOperation({ summary: '提交建议反馈（accepted / dismissed / snoozed）' })
  async feedback(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Body('action') action: string,
  ) {
    const userId = req.user.id;
    return this.proactiveService.submitFeedback(userId, id, action);
  }

  @Post('dismiss-all')
  @ApiOperation({ summary: '一键忽略所有待展示建议' })
  async dismissAll(@Req() req: { user: { id: string } }) {
    const userId = req.user.id;
    return this.proactiveService.dismissAll(userId);
  }

  @Get('stats')
  @ApiOperation({ summary: '建议统计（接受率、类型分布）' })
  async getStats(@Req() req: { user: { id: string } }) {
    const userId = req.user.id;
    return this.proactiveService.getStats(userId);
  }
}
