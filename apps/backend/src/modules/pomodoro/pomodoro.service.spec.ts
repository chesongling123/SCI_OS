import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PomodoroService } from './pomodoro.service';
import { PrismaService } from '../../shared/prisma.service';
import { createMockPrisma } from '../../shared/prisma.mock';

describe('PomodoroService', () => {
  let service: PomodoroService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    prisma = createMockPrisma();
    const module = await Test.createTestingModule({
      providers: [
        PomodoroService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(PomodoroService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('应创建不带关联的番茄钟会话', async () => {
      prisma.pomodoroSession.create.mockResolvedValue({ id: 'sess-1' } as any);

      const result = await service.create('user-1', { plannedDuration: 1500 });

      expect(prisma.pomodoroSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          plannedDuration: 1500,
          taskId: null,
          referenceId: null,
          duration: 0,
          interruptions: 0,
        }),
      });
      expect(result).toEqual({ id: 'sess-1' });
    });

    it('应创建关联任务和文献的番茄钟会话', async () => {
      prisma.pomodoroSession.create.mockResolvedValue({ id: 'sess-2' } as any);

      await service.create('user-1', {
        taskId: 'task-1',
        referenceId: 'ref-1',
        plannedDuration: 1800,
      });

      expect(prisma.pomodoroSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          taskId: 'task-1',
          referenceId: 'ref-1',
          plannedDuration: 1800,
        }),
      });
    });
  });

  describe('end', () => {
    it('应正常结束会话并返回结果', async () => {
      prisma.pomodoroSession.findFirst.mockResolvedValue({
        id: 'sess-1',
        userId: 'user-1',
        taskId: null,
        referenceId: null,
      } as any);
      prisma.pomodoroSession.update.mockResolvedValue({
        id: 'sess-1',
        duration: 1200,
        interruptions: 1,
      } as any);
      prisma.$transaction.mockImplementation(async (fn: any) => fn(prisma));

      const result = await service.end('user-1', 'sess-1', {
        duration: 1200,
        interruptions: 1,
      });

      expect(prisma.pomodoroSession.findFirst).toHaveBeenCalledWith({
        where: { id: 'sess-1', userId: 'user-1' },
      });
      expect(result).toEqual(
        expect.objectContaining({
          id: 'sess-1',
          duration: 1200,
          interruptions: 1,
        }),
      );
    });

    it('会话不存在时应抛出 NotFoundException', async () => {
      prisma.pomodoroSession.findFirst.mockResolvedValue(null);

      await expect(
        service.end('user-1', 'sess-x', { duration: 100 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('应联动更新关联任务的 pomodoroCount', async () => {
      prisma.pomodoroSession.findFirst.mockResolvedValue({
        id: 'sess-1',
        userId: 'user-1',
        taskId: 'task-1',
        referenceId: null,
      } as any);
      prisma.$transaction.mockImplementation(async (fn: any) => fn(prisma));

      await service.end('user-1', 'sess-1', { duration: 1500 });

      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { pomodoroCount: { increment: 1 } },
      });
    });

    it('应联动更新关联文献的阅读统计', async () => {
      prisma.pomodoroSession.findFirst.mockResolvedValue({
        id: 'sess-1',
        userId: 'user-1',
        taskId: null,
        referenceId: 'ref-1',
      } as any);
      prisma.$transaction.mockImplementation(async (fn: any) => fn(prisma));

      await service.end('user-1', 'sess-1', { duration: 1800 });

      expect(prisma.reference.update).toHaveBeenCalledWith({
        where: { id: 'ref-1' },
        data: {
          totalReadTime: { increment: 1800 },
          readCount: { increment: 1 },
          lastReadAt: expect.any(Date),
        },
      });
    });
  });

  describe('findToday', () => {
    it('应返回今日会话并包含关联对象', async () => {
      prisma.pomodoroSession.findMany.mockResolvedValue([
        { id: 's1', task: { id: 't1', title: '任务A' } },
      ] as any);

      const result = await service.findToday('user-1');

      expect(prisma.pomodoroSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            task: { select: { id: true, title: true } },
            reference: { select: { id: true, title: true } },
          },
        }),
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('getTodayStats', () => {
    it('应正确聚合今日统计数据', async () => {
      prisma.pomodoroSession.findMany.mockResolvedValue([
        { duration: 1500, interruptions: 0 },
        { duration: 1200, interruptions: 1 },
      ] as any);

      const result = await service.getTodayStats('user-1');

      expect(result).toEqual({
        totalDuration: 2700,
        completedCount: 2,
        interruptionCount: 1,
        sessions: expect.any(Array),
      });
    });
  });
});
