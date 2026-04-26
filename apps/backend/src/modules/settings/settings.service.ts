import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import { UpdateSettingsDto } from './dto';

/**
 * 用户设置服务
 * 每个用户仅有一条设置记录，首次访问时自动创建默认值
 */
@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreate(userId: string) {
    let settings = await this.prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await this.prisma.userSettings.create({
        data: { userId },
      });
    }

    return settings;
  }

  async update(userId: string, dto: UpdateSettingsDto) {
    await this.findOrCreate(userId);

    const data: Record<string, unknown> = {};

    // 外观
    if (dto.theme !== undefined) data.theme = dto.theme;
    if (dto.glassIntensity !== undefined) data.glassIntensity = dto.glassIntensity;
    if (dto.fontSize !== undefined) data.fontSize = dto.fontSize;
    if (dto.sidebarCollapsed !== undefined) data.sidebarCollapsed = dto.sidebarCollapsed;

    // AI
    if (dto.llmProvider !== undefined) data.llmProvider = dto.llmProvider;
    if (dto.llmModel !== undefined) data.llmModel = dto.llmModel;
    if (dto.temperature !== undefined) data.temperature = dto.temperature;
    if (dto.maxTokens !== undefined) data.maxTokens = dto.maxTokens;
    if (dto.systemPrompt !== undefined) data.systemPrompt = dto.systemPrompt;
    if (dto.functionCalling !== undefined) data.functionCalling = dto.functionCalling;
    if (dto.ragThreshold !== undefined) data.ragThreshold = dto.ragThreshold;
    if (dto.ragTopK !== undefined) data.ragTopK = dto.ragTopK;
    if (dto.streamingOutput !== undefined) data.streamingOutput = dto.streamingOutput;

    // 番茄钟
    if (dto.pomodoroFocus !== undefined) data.pomodoroFocus = dto.pomodoroFocus;
    if (dto.pomodoroShortBreak !== undefined) data.pomodoroShortBreak = dto.pomodoroShortBreak;
    if (dto.pomodoroLongBreak !== undefined) data.pomodoroLongBreak = dto.pomodoroLongBreak;
    if (dto.pomodoroAutoBreak !== undefined) data.pomodoroAutoBreak = dto.pomodoroAutoBreak;
    if (dto.pomodoroAutoFocus !== undefined) data.pomodoroAutoFocus = dto.pomodoroAutoFocus;
    if (dto.pomodoroDailyGoal !== undefined) data.pomodoroDailyGoal = dto.pomodoroDailyGoal;

    // 日程
    if (dto.weekStart !== undefined) data.weekStart = dto.weekStart;
    if (dto.defaultCalendarView !== undefined) data.defaultCalendarView = dto.defaultCalendarView;
    if (dto.defaultReminder !== undefined) data.defaultReminder = dto.defaultReminder;

    // 文献
    if (dto.defaultCitationFormat !== undefined) data.defaultCitationFormat = dto.defaultCitationFormat;

    // 通知
    if (dto.desktopNotification !== undefined) data.desktopNotification = dto.desktopNotification;
    if (dto.pomodoroSound !== undefined) data.pomodoroSound = dto.pomodoroSound;
    if (dto.eventReminder !== undefined) data.eventReminder = dto.eventReminder;

    // 数据
    if (dto.autoBackup !== undefined) data.autoBackup = dto.autoBackup;
    if (dto.backupFrequency !== undefined) data.backupFrequency = dto.backupFrequency;

    return this.prisma.userSettings.update({
      where: { userId },
      data,
    });
  }
}
