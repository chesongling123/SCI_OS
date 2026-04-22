import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { TaskService } from './task.service';
import { CreateTaskDto, UpdateTaskDto, MoveTaskDto } from './dto';
import { TaskStatus } from '@phd/shared-types';

/**
 * 任务控制器
 * 路由前缀：/api/v1/tasks（由全局前缀 + 控制器路径拼接）
 */
@ApiTags('任务管理')
@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get()
  @ApiOperation({ summary: '获取任务列表' })
  @ApiQuery({ name: 'status', required: false, enum: TaskStatus, description: '按状态过滤' })
  @ApiResponse({ status: 200, description: '返回任务列表' })
  findAll(@Query('status') status?: TaskStatus) {
    return this.taskService.findAll(status);
  }

  @Post()
  @ApiOperation({ summary: '创建任务' })
  @ApiResponse({ status: 201, description: '任务创建成功' })
  @ApiResponse({ status: 400, description: '请求参数校验失败' })
  create(@Body() dto: CreateTaskDto) {
    return this.taskService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新任务' })
  @ApiResponse({ status: 200, description: '任务更新成功' })
  @ApiResponse({ status: 404, description: '任务不存在' })
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.taskService.update(id, dto);
  }

  @Patch(':id/move')
  @ApiOperation({ summary: '拖拽移动任务（跨列/同列重排）' })
  @ApiResponse({ status: 200, description: '任务移动成功' })
  @ApiResponse({ status: 404, description: '任务不存在' })
  move(@Param('id') id: string, @Body() dto: MoveTaskDto) {
    return this.taskService.move(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '软删除任务' })
  @ApiResponse({ status: 200, description: '任务删除成功' })
  @ApiResponse({ status: 404, description: '任务不存在' })
  remove(@Param('id') id: string) {
    return this.taskService.remove(id);
  }
}
