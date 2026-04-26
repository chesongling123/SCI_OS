import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { TaskService } from './task.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTaskDto, UpdateTaskDto, MoveTaskDto } from './dto';
import { TaskStatus } from '@research/shared-types';

@ApiTags('任务管理')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get()
  @ApiOperation({ summary: '获取任务列表' })
  @ApiQuery({ name: 'status', required: false, enum: TaskStatus, description: '按状态过滤' })
  @ApiQuery({ name: 'referenceId', required: false, description: '按关联文献 ID 过滤' })
  @ApiResponse({ status: 200, description: '返回任务列表' })
  findAll(
    @Request() req: { user: { id: string } },
    @Query('status') status?: TaskStatus,
    @Query('referenceId') referenceId?: string,
  ) {
    return this.taskService.findAll(req.user.id, status, referenceId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取任务详情' })
  @ApiResponse({ status: 200, description: '返回任务详情' })
  @ApiResponse({ status: 404, description: '任务不存在' })
  findOne(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.taskService.findOne(req.user.id, id);
  }

  @Post()
  @ApiOperation({ summary: '创建任务' })
  @ApiResponse({ status: 201, description: '任务创建成功' })
  @ApiResponse({ status: 400, description: '请求参数校验失败' })
  create(@Request() req: { user: { id: string } }, @Body() dto: CreateTaskDto) {
    return this.taskService.create(req.user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新任务' })
  @ApiResponse({ status: 200, description: '任务更新成功' })
  @ApiResponse({ status: 404, description: '任务不存在' })
  update(@Request() req: { user: { id: string } }, @Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.taskService.update(req.user.id, id, dto);
  }

  @Patch(':id/move')
  @ApiOperation({ summary: '拖拽移动任务（跨列/同列重排）' })
  @ApiResponse({ status: 200, description: '任务移动成功' })
  @ApiResponse({ status: 404, description: '任务不存在' })
  move(@Request() req: { user: { id: string } }, @Param('id') id: string, @Body() dto: MoveTaskDto) {
    return this.taskService.move(req.user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '软删除任务' })
  @ApiResponse({ status: 200, description: '任务删除成功' })
  @ApiResponse({ status: 404, description: '任务不存在' })
  remove(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.taskService.remove(req.user.id, id);
  }
}
