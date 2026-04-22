import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CalendarService } from './calendar.service';
import { CreateEventDto, UpdateEventDto } from './dto';

/**
 * 日程控制器
 * 路由前缀：/api/v1/calendar/events
 */
@ApiTags('日程管理')
@Controller('calendar/events')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  @ApiOperation({ summary: '获取事件列表' })
  @ApiQuery({ name: 'startFrom', required: false, description: '开始时间下限（ISO 8601）' })
  @ApiQuery({ name: 'startTo', required: false, description: '开始时间上限（ISO 8601）' })
  @ApiResponse({ status: 200, description: '返回事件列表' })
  findAll(
    @Query('startFrom') startFrom?: string,
    @Query('startTo') startTo?: string,
  ) {
    return this.calendarService.findAll(startFrom, startTo);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个事件' })
  @ApiResponse({ status: 200, description: '返回事件详情' })
  @ApiResponse({ status: 404, description: '事件不存在' })
  findOne(@Param('id') id: string) {
    return this.calendarService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '创建事件' })
  @ApiResponse({ status: 201, description: '事件创建成功' })
  create(@Body() dto: CreateEventDto) {
    return this.calendarService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新事件' })
  @ApiResponse({ status: 200, description: '事件更新成功' })
  @ApiResponse({ status: 404, description: '事件不存在' })
  update(@Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.calendarService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '软删除事件' })
  @ApiResponse({ status: 200, description: '事件删除成功' })
  @ApiResponse({ status: 404, description: '事件不存在' })
  remove(@Param('id') id: string) {
    return this.calendarService.remove(id);
  }
}
