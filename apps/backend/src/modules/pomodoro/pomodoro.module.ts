import { Module } from '@nestjs/common';
import { PomodoroController } from './pomodoro.controller';
import { PomodoroService } from './pomodoro.service';

/**
 * 番茄钟模块（Phase 1）
 * 职责：专注计时记录、中断追踪、高效时段分析 API
 */
@Module({
  controllers: [PomodoroController],
  providers: [PomodoroService],
})
export class PomodoroModule {}
