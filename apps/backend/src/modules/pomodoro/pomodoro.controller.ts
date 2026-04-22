import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PomodoroService } from './pomodoro.service';
import { CreateSessionDto, EndSessionDto } from './dto';

/**
 * 番茄钟控制器
 * 路由前缀：/api/v1/pomodoro
 */
@ApiTags('番茄钟')
@Controller('pomodoro')
export class PomodoroController {
  constructor(private readonly pomodoroService: PomodoroService) {}

  @Post('sessions')
  @ApiOperation({ summary: '开始番茄钟会话' })
  @ApiResponse({ status: 201, description: '会话创建成功' })
  createSession(@Body() dto: CreateSessionDto) {
    return this.pomodoroService.create(dto);
  }

  @Patch('sessions/:id/end')
  @ApiOperation({ summary: '结束番茄钟会话' })
  @ApiResponse({ status: 200, description: '会话结束成功' })
  @ApiResponse({ status: 404, description: '会话不存在' })
  endSession(@Param('id') id: string, @Body() dto: EndSessionDto) {
    return this.pomodoroService.end(id, dto);
  }

  @Get('sessions/today')
  @ApiOperation({ summary: '获取今日会话列表' })
  @ApiResponse({ status: 200, description: '返回今日会话' })
  findToday() {
    return this.pomodoroService.findToday();
  }

  @Get('sessions/history')
  @ApiOperation({ summary: '获取历史会话' })
  @ApiQuery({ name: 'days', required: false, description: '查询天数（默认 365）' })
  @ApiResponse({ status: 200, description: '返回历史会话' })
  findHistory(@Query('days') days?: string) {
    return this.pomodoroService.findHistory(days ? parseInt(days, 10) : 365);
  }

  @Get('stats/today')
  @ApiOperation({ summary: '获取今日统计' })
  @ApiResponse({ status: 200, description: '返回今日专注统计' })
  getTodayStats() {
    return this.pomodoroService.getTodayStats();
  }

  @Get('stats/daily')
  @ApiOperation({ summary: '按日期聚合统计（热力图数据）' })
  @ApiQuery({ name: 'days', required: false, description: '查询天数（默认 365）' })
  @ApiResponse({ status: 200, description: '返回每日聚合统计' })
  getDailyStats(@Query('days') days?: string) {
    return this.pomodoroService.getDailyStats(days ? parseInt(days, 10) : 365);
  }
}
