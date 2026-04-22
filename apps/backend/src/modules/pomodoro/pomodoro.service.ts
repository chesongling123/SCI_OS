import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import { CreateSessionDto, EndSessionDto } from './dto';

/**
 * 番茄钟服务
 * 职责：专注计时记录、中断追踪、高效时段分析
 */
@Injectable()
export class PomodoroService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 开始番茄钟会话
   */
  async create(dto: CreateSessionDto) {
    const defaultUser = await this.prisma.user.upsert({
      where: { email: 'demo@phd-os.local' },
      update: {},
      create: { email: 'demo@phd-os.local', name: '演示用户' },
    });

    return this.prisma.pomodoroSession.create({
      data: {
        taskId: dto.taskId ?? null,
        plannedDuration: dto.plannedDuration ?? 1500,
        duration: 0,
        interruptions: 0,
        startedAt: new Date(),
        userId: defaultUser.id,
      } as any,
    });
  }

  /**
   * 结束番茄钟会话
   */
  async end(id: string, dto: EndSessionDto) {
    const session = await this.prisma.pomodoroSession.findUnique({
      where: { id },
    });
    if (!session) throw new NotFoundException(`会话 ${id} 不存在`);

    return this.prisma.pomodoroSession.update({
      where: { id },
      data: {
        duration: dto.duration,
        interruptions: dto.interruptions ?? 0,
        endedAt: new Date(),
      },
    });
  }

  /**
   * 获取今日会话列表
   */
  async findToday() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.pomodoroSession.findMany({
      where: {
        startedAt: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  /**
   * 获取历史会话（用于热力图）
   */
  async findHistory(days: number = 365) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return this.prisma.pomodoroSession.findMany({
      where: {
        startedAt: { gte: since },
        endedAt: { not: null },
      },
      orderBy: { startedAt: 'asc' },
    });
  }

  /**
   * 今日统计
   */
  async getTodayStats() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const sessions = await this.prisma.pomodoroSession.findMany({
      where: {
        startedAt: { gte: startOfDay, lte: endOfDay },
        endedAt: { not: null },
      },
    });

    const totalDuration = sessions.reduce((sum, s) => sum + s.duration, 0);
    const completedCount = sessions.length;
    const interruptionCount = sessions.reduce((sum, s) => sum + s.interruptions, 0);

    return {
      totalDuration,
      completedCount,
      interruptionCount,
      sessions,
    };
  }

  /**
   * 按日期聚合统计（用于热力图）
   */
  async getDailyStats(days: number = 365) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const sessions = await this.prisma.pomodoroSession.findMany({
      where: {
        startedAt: { gte: since },
        endedAt: { not: null },
      },
    });

    // 按日期聚合
    const map = new Map<string, { duration: number; count: number }>();
    for (const s of sessions) {
      const date = s.startedAt.toISOString().split('T')[0];
      const prev = map.get(date) ?? { duration: 0, count: 0 };
      map.set(date, {
        duration: prev.duration + s.duration,
        count: prev.count + 1,
      });
    }

    return Array.from(map.entries()).map(([date, stats]) => ({
      date,
      ...stats,
    }));
  }
}
