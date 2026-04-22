import { Module } from '@nestjs/common';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';

/**
 * 日程模块（Phase 1）
 * 职责：事件 CRUD、iCal 导入导出、RRULE 展开、外部日历同步
 */
@Module({
  controllers: [CalendarController],
  providers: [CalendarService],
})
export class CalendarModule {}
