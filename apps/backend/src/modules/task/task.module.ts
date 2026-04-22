import { Module } from '@nestjs/common';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';

/**
 * 任务模块（Phase 1）
 * 职责：任务 CRUD、子任务树、标签系统、拖拽排序、番茄数关联
 */
@Module({
  controllers: [TaskController],
  providers: [TaskService],
})
export class TaskModule {}
