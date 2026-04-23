import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import { TaskStatus } from '@prisma/client';

/**
 * AI 工具定义 —— Anthropic native format (name + input_schema)
 * Kimi Coding API 要求此格式，不接受 OpenAI function format
 */
export const PHD_OS_TOOLS = [
  {
    name: 'get_tasks',
    description: '查询用户的任务列表，支持按状态和优先级筛选',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: {
          type: 'string',
          enum: ['TODO', 'IN_PROGRESS', 'DONE'],
          description: '任务状态筛选，不传则返回所有状态',
        },
        priority: {
          type: 'number',
          description: '优先级筛选：1=P1最高, 2=P2, 3=P3, 4=P4最低',
        },
        limit: {
          type: 'number',
          description: '返回数量上限，默认 20',
          default: 20,
        },
      },
    },
  },
  {
    name: 'get_calendar_events',
    description: '查询用户的日程事件',
    input_schema: {
      type: 'object' as const,
      properties: {
        date: {
          type: 'string',
          description: '查询起始日期，格式 YYYY-MM-DD，默认今天',
        },
        days: {
          type: 'number',
          description: '查询未来 N 天的事件，默认 7',
          default: 7,
        },
      },
    },
  },
  {
    name: 'get_pomodoro_stats',
    description: '查询番茄钟专注统计数据',
    input_schema: {
      type: 'object' as const,
      properties: {
        period: {
          type: 'string',
          enum: ['today', 'week', 'month'],
          description: '统计周期，默认 today',
          default: 'today',
        },
      },
    },
  },
  {
    name: 'get_today_summary',
    description: '获取今日综合概览，包括任务、日程和番茄钟数据',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
];

/**
 * AI 工具执行服务
 * 直接通过 Prisma 查询数据库，不依赖其他 Module 的 Service
 */
@Injectable()
export class AiToolsService {
  private readonly logger = new Logger(AiToolsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 执行指定工具
   */
  async execute(name: string, input: Record<string, unknown>, userId: string): Promise<string> {
    this.logger.debug(`执行工具: ${name}, 用户: ${userId}, 参数: ${JSON.stringify(input)}`);

    try {
      switch (name) {
        case 'get_tasks':
          return await this.getTasks(userId, input);
        case 'get_calendar_events':
          return await this.getCalendarEvents(userId, input);
        case 'get_pomodoro_stats':
          return await this.getPomodoroStats(userId, input);
        case 'get_today_summary':
          return await this.getTodaySummary(userId);
        default:
          throw new Error(`未知工具: ${name}`);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`工具 ${name} 执行失败: ${msg}`);
      return JSON.stringify({ error: msg });
    }
  }

  // ===== 具体工具实现 =====

  private async getTasks(userId: string, input: Record<string, unknown>): Promise<string> {
    const status = input.status as string | undefined;
    const limit = Math.min(Number(input.limit ?? 20), 50);

    const tasks = await this.prisma.task.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(status ? { status: status as TaskStatus } : {}),
      },
      orderBy: [{ status: 'asc' }, { sortOrder: 'asc' }],
      take: limit,
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        pomodoroCount: true,
        dueDate: true,
        createdAt: true,
      },
    });

    return JSON.stringify({
      count: tasks.length,
      tasks: tasks.map((t) => ({
        ...t,
        dueDate: t.dueDate?.toISOString() ?? null,
        createdAt: t.createdAt.toISOString(),
      })),
    });
  }

  private async getCalendarEvents(userId: string, input: Record<string, unknown>): Promise<string> {
    const dateStr = (input.date as string) ?? new Date().toISOString().split('T')[0];
    const days = Math.min(Number(input.days ?? 7), 30);

    const startDate = new Date(dateStr);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + days);
    endDate.setHours(23, 59, 59, 999);

    const events = await this.prisma.event.findMany({
      where: {
        userId,
        deletedAt: null,
        startAt: { gte: startDate, lte: endDate },
      },
      orderBy: { startAt: 'asc' },
      select: {
        id: true,
        title: true,
        startAt: true,
        endAt: true,
        location: true,
        description: true,
        isAllDay: true,
      },
    });

    return JSON.stringify({
      period: { from: dateStr, days },
      count: events.length,
      events: events.map((e) => ({
        ...e,
        startAt: e.startAt.toISOString(),
        endAt: e.endAt.toISOString(),
      })),
    });
  }

  private async getPomodoroStats(userId: string, input: Record<string, unknown>): Promise<string> {
    const period = (input.period as string) ?? 'today';

    let startDate: Date;
    let endDate: Date;

    if (period === 'today') {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'week') {
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else {
      // month
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
    }

    const sessions = await this.prisma.pomodoroSession.findMany({
      where: {
        userId,
        startedAt: { gte: startDate, lte: endDate },
        endedAt: { not: null },
      },
      orderBy: { startedAt: 'desc' },
      select: {
        duration: true,
        plannedDuration: true,
        interruptions: true,
        startedAt: true,
      },
    });

    const totalDuration = sessions.reduce((sum, s) => sum + s.duration, 0);
    const totalPlanned = sessions.reduce((sum, s) => sum + s.plannedDuration, 0);
    const completedCount = sessions.length;
    const interruptionCount = sessions.reduce((sum, s) => sum + s.interruptions, 0);

    // 日均数据（week/month）
    let dailyAvg = null;
    if (period !== 'today' && completedCount > 0) {
      const days = period === 'week' ? 7 : 30;
      dailyAvg = {
        duration: Math.round(totalDuration / days),
        count: Number((completedCount / days).toFixed(1)),
      };
    }

    return JSON.stringify({
      period,
      summary: {
        totalDuration,
        totalPlanned,
        completedCount,
        interruptionCount,
        completionRate: totalPlanned > 0 ? Number((totalDuration / totalPlanned * 100).toFixed(1)) : 0,
        dailyAvg,
      },
      sessions: sessions.slice(0, 10).map((s) => ({
        ...s,
        startedAt: s.startedAt.toISOString(),
      })),
    });
  }

  private async getTodaySummary(userId: string): Promise<string> {
    const todayStr = new Date().toISOString().split('T')[0];

    const [tasks, events, pomodoro] = await Promise.all([
      this.prisma.task.findMany({
        where: { userId, deletedAt: null },
        orderBy: [{ status: 'asc' }, { sortOrder: 'asc' }],
        take: 20,
        select: { title: true, status: true, priority: true, pomodoroCount: true },
      }),
      this.prisma.event.findMany({
        where: {
          userId,
          deletedAt: null,
          startAt: {
            gte: new Date(`${todayStr}T00:00:00.000Z`),
            lte: new Date(`${todayStr}T23:59:59.999Z`),
          },
        },
        orderBy: { startAt: 'asc' },
        select: { title: true, startAt: true, endAt: true, location: true },
      }),
      this.getPomodoroStats(userId, { period: 'today' }),
    ]);

    const todoCount = tasks.filter((t) => t.status === 'TODO').length;
    const inProgressCount = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const doneCount = tasks.filter((t) => t.status === 'DONE').length;

    return JSON.stringify({
      date: todayStr,
      tasks: {
        total: tasks.length,
        todo: todoCount,
        inProgress: inProgressCount,
        done: doneCount,
        topPriority: tasks
          .filter((t) => t.status !== 'DONE')
          .sort((a, b) => a.priority - b.priority)
          .slice(0, 5)
          .map((t) => t.title),
      },
      events: {
        count: events.length,
        list: events.map((e) => ({
          title: e.title,
          time: `${e.startAt.toISOString().slice(11, 16)}-${e.endAt.toISOString().slice(11, 16)}`,
          location: e.location,
        })),
      },
      pomodoro: JSON.parse(pomodoro),
    });
  }
}
