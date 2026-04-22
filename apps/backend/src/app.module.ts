import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './modules/auth/auth.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { TaskModule } from './modules/task/task.module';
import { PomodoroModule } from './modules/pomodoro/pomodoro.module';

/**
 * 根模块
 * Phase 1 挂载：CalendarModule / TaskModule / PomodoroModule
 * Phase 2 挂载：NoteModule / FileModule / AiModule
 */
@Module({
  imports: [
    // 共享能力（Prisma、Redis 等）
    SharedModule,

    // 限流保护：每分钟最多 100 次请求
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 100,
        },
      ],
    }),

    // Phase 1 核心模块
    AuthModule,
    CalendarModule,
    TaskModule,
    PomodoroModule,
  ],
})
export class AppModule {}
