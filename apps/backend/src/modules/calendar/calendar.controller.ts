import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { CalendarService } from './calendar.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateEventDto, UpdateEventDto } from './dto';

@ApiTags('日程管理')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('calendar/events')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  @ApiOperation({ summary: '获取事件列表' })
  @ApiQuery({ name: 'startFrom', required: false, description: '开始时间下限（ISO 8601）' })
  @ApiQuery({ name: 'startTo', required: false, description: '开始时间上限（ISO 8601）' })
  @ApiResponse({ status: 200, description: '返回事件列表' })
  findAll(
    @Request() req: { user: { id: string } },
    @Query('startFrom') startFrom?: string,
    @Query('startTo') startTo?: string,
  ) {
    return this.calendarService.findAll(req.user.id, startFrom, startTo);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个事件' })
  @ApiResponse({ status: 200, description: '返回事件详情' })
  @ApiResponse({ status: 404, description: '事件不存在' })
  findOne(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.calendarService.findOne(req.user.id, id);
  }

  @Post()
  @ApiOperation({ summary: '创建事件' })
  @ApiResponse({ status: 201, description: '事件创建成功' })
  create(@Request() req: { user: { id: string } }, @Body() dto: CreateEventDto) {
    return this.calendarService.create(req.user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新事件' })
  @ApiResponse({ status: 200, description: '事件更新成功' })
  @ApiResponse({ status: 404, description: '事件不存在' })
  update(@Request() req: { user: { id: string } }, @Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.calendarService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '软删除事件' })
  @ApiResponse({ status: 200, description: '事件删除成功' })
  @ApiResponse({ status: 404, description: '事件不存在' })
  remove(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.calendarService.remove(req.user.id, id);
  }
}
