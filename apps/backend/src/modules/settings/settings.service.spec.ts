import { Test } from '@nestjs/testing';
import { SettingsService } from './settings.service';
import { PrismaService } from '../../shared/prisma.service';
import { createMockPrisma } from '../../shared/prisma.mock';

describe('SettingsService', () => {
  let service: SettingsService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    prisma = createMockPrisma();
    const module = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(SettingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOrCreate', () => {
    it('应返回已有设置记录', async () => {
      const existing = {
        id: 'settings-1',
        userId: 'user-1',
        theme: 'dark',
        llmProvider: 'kimi',
        pomodoroFocus: 25,
      };
      prisma.userSettings.findUnique.mockResolvedValue(existing as any);

      const result = await service.findOrCreate('user-1');

      expect(prisma.userSettings.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(result).toEqual(existing);
      expect(prisma.userSettings.create).not.toHaveBeenCalled();
    });

    it('无记录时应自动创建默认设置', async () => {
      prisma.userSettings.findUnique.mockResolvedValue(null);
      const created = { id: 'settings-new', userId: 'user-1' };
      prisma.userSettings.create.mockResolvedValue(created as any);

      const result = await service.findOrCreate('user-1');

      expect(prisma.userSettings.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(prisma.userSettings.create).toHaveBeenCalledWith({
        data: { userId: 'user-1' },
      });
      expect(result).toEqual(created);
    });
  });

  describe('update', () => {
    it('应更新外观设置字段', async () => {
      prisma.userSettings.findUnique.mockResolvedValue({ id: 's1' } as any);
      prisma.userSettings.update.mockResolvedValue({
        id: 's1',
        userId: 'user-1',
        theme: 'dark',
        glassIntensity: 150,
        fontSize: 'large',
        sidebarCollapsed: true,
      } as any);

      const result = await service.update('user-1', {
        theme: 'dark',
        glassIntensity: 150,
        fontSize: 'large',
        sidebarCollapsed: true,
      });

      expect(prisma.userSettings.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: {
          theme: 'dark',
          glassIntensity: 150,
          fontSize: 'large',
          sidebarCollapsed: true,
        },
      });
      expect(result.theme).toBe('dark');
      expect(result.glassIntensity).toBe(150);
    });

    it('应更新 AI 设置字段', async () => {
      prisma.userSettings.findUnique.mockResolvedValue({ id: 's1' } as any);
      prisma.userSettings.update.mockResolvedValue({
        id: 's1',
        temperature: 0.5,
        maxTokens: 2048,
        functionCalling: false,
      } as any);

      const result = await service.update('user-1', {
        temperature: 0.5,
        maxTokens: 2048,
        functionCalling: false,
      });

      expect(prisma.userSettings.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: {
          temperature: 0.5,
          maxTokens: 2048,
          functionCalling: false,
        },
      });
      expect(result.temperature).toBe(0.5);
    });

    it('应更新番茄钟设置字段', async () => {
      prisma.userSettings.findUnique.mockResolvedValue({ id: 's1' } as any);
      prisma.userSettings.update.mockResolvedValue({
        id: 's1',
        pomodoroFocus: 45,
        pomodoroShortBreak: 10,
        pomodoroDailyGoal: 12,
      } as any);

      const result = await service.update('user-1', {
        pomodoroFocus: 45,
        pomodoroShortBreak: 10,
        pomodoroDailyGoal: 12,
      });

      expect(prisma.userSettings.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: {
          pomodoroFocus: 45,
          pomodoroShortBreak: 10,
          pomodoroDailyGoal: 12,
        },
      });
      expect(result.pomodoroFocus).toBe(45);
    });

    it('应忽略未提供的字段', async () => {
      prisma.userSettings.findUnique.mockResolvedValue({ id: 's1' } as any);
      prisma.userSettings.update.mockResolvedValue({
        id: 's1',
        theme: 'light',
      } as any);

      await service.update('user-1', { theme: 'light' });

      expect(prisma.userSettings.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { theme: 'light' },
      });
    });
  });
});
