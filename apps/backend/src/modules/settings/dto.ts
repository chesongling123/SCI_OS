import { IsOptional, IsString, IsNumber, IsBoolean, Min, Max, IsIn } from 'class-validator';

export class UpdateSettingsDto {
  // 外观
  @IsOptional()
  @IsIn(['light', 'dark', 'system'])
  theme?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(200)
  glassIntensity?: number;

  @IsOptional()
  @IsIn(['small', 'medium', 'large'])
  fontSize?: string;

  @IsOptional()
  @IsBoolean()
  sidebarCollapsed?: boolean;

  // AI
  @IsOptional()
  @IsString()
  llmProvider?: string;

  @IsOptional()
  @IsString()
  llmModel?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsNumber()
  @Min(256)
  @Max(8192)
  maxTokens?: number;

  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @IsOptional()
  @IsBoolean()
  functionCalling?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  ragThreshold?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  ragTopK?: number;

  @IsOptional()
  @IsBoolean()
  streamingOutput?: boolean;

  // 番茄钟
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(120)
  pomodoroFocus?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(60)
  pomodoroShortBreak?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(120)
  pomodoroLongBreak?: number;

  @IsOptional()
  @IsBoolean()
  pomodoroAutoBreak?: boolean;

  @IsOptional()
  @IsBoolean()
  pomodoroAutoFocus?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  pomodoroDailyGoal?: number;

  // 日程
  @IsOptional()
  @IsIn(['monday', 'sunday'])
  weekStart?: string;

  @IsOptional()
  @IsIn(['month', 'week', 'day'])
  defaultCalendarView?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1440)
  defaultReminder?: number;

  // 文献
  @IsOptional()
  @IsIn(['gb7714', 'apa', 'mla', 'chicago', 'bibtex'])
  defaultCitationFormat?: string;

  // 通知
  @IsOptional()
  @IsBoolean()
  desktopNotification?: boolean;

  @IsOptional()
  @IsBoolean()
  pomodoroSound?: boolean;

  @IsOptional()
  @IsBoolean()
  eventReminder?: boolean;

  // 数据
  @IsOptional()
  @IsBoolean()
  autoBackup?: boolean;

  @IsOptional()
  @IsIn(['daily', 'weekly', 'monthly'])
  backupFrequency?: string;

  // 主动建议
  @IsOptional()
  @IsBoolean()
  proactiveSuggestions?: boolean;

  @IsOptional()
  @IsIn(['low', 'medium', 'high'])
  proactiveFrequency?: string;

  @IsOptional()
  proactiveChannels?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  quietHoursStart?: string | null;

  @IsOptional()
  @IsString()
  quietHoursEnd?: string | null;
}
