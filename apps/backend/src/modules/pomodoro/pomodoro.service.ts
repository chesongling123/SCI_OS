import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import { CreateSessionDto, EndSessionDto } from './dto';

@Injectable()
export class PomodoroService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateSessionDto) {
    return this.prisma.pomodoroSession.create({
      data: {
        taskId: dto.taskId ?? null,
        referenceId: dto.referenceId ?? null,
        plannedDuration: dto.plannedDuration ?? 1500,
        duration: 0,
        interruptions: 0,
        startedAt: new Date(),
        userId,
      } as any,
    });
  }

  async end(userId: string, id: string, dto: EndSessionDto) {
    const session = await this.prisma.pomodoroSession.findFirst({
      where: { id, userId },
    });
    if (!session) throw new NotFoundException(`会话 ${id} 不存在`);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.pomodoroSession.update({
        where: { id },
        data: {
          duration: dto.duration,
          interruptions: dto.interruptions ?? 0,
          endedAt: new Date(),
        },
        include: {
          task: { select: { id: true, title: true } },
          reference: { select: { id: true, title: true } },
        },
      });

      if (session.taskId) {
        await tx.task.update({
          where: { id: session.taskId },
          data: { pomodoroCount: { increment: 1 } },
        });
      }

      if (session.referenceId) {
        await tx.reference.update({
          where: { id: session.referenceId },
          data: {
            totalReadTime: { increment: dto.duration },
            readCount: { increment: 1 },
            lastReadAt: new Date(),
          },
        });
      }

      return updated;
    });
  }

  async findToday(userId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.pomodoroSession.findMany({
      where: {
        userId,
        startedAt: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { startedAt: 'desc' },
      include: {
        task: { select: { id: true, title: true } },
        reference: { select: { id: true, title: true } },
      },
    });
  }

  async findHistory(userId: string, days: number = 365) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return this.prisma.pomodoroSession.findMany({
      where: {
        userId,
        startedAt: { gte: since },
        endedAt: { not: null },
      },
      orderBy: { startedAt: 'asc' },
      include: {
        task: { select: { id: true, title: true } },
        reference: { select: { id: true, title: true } },
      },
    });
  }

  async getTodayStats(userId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const sessions = await this.prisma.pomodoroSession.findMany({
      where: {
        userId,
        startedAt: { gte: startOfDay, lte: endOfDay },
        endedAt: { not: null },
      },
      include: {
        task: { select: { id: true, title: true } },
        reference: { select: { id: true, title: true } },
      },
    });

    const totalDuration = sessions.reduce((sum, s) => sum + s.duration, 0);
    const completedCount = sessions.length;
    const interruptionCount = sessions.reduce((sum, s) => sum + s.interruptions, 0);

    return { totalDuration, completedCount, interruptionCount, sessions };
  }

  async getDailyStats(userId: string, days: number = 365) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const sessions = await this.prisma.pomodoroSession.findMany({
      where: {
        userId,
        startedAt: { gte: since },
        endedAt: { not: null },
      },
    });

    const map = new Map<string, { duration: number; count: number }>();
    for (const s of sessions) {
      const date = s.startedAt.toISOString().split('T')[0];
      const prev = map.get(date) ?? { duration: 0, count: 0 };
      map.set(date, { duration: prev.duration + s.duration, count: prev.count + 1 });
    }

    return Array.from(map.entries()).map(([date, stats]) => ({ date, ...stats }));
  }
}
