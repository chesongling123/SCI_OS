import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { LlmService } from '../llm.service';
import { AiToolsService } from '../ai-tools.service';

/**
 * 主动建议上下文
 */
interface ProactiveContext {
  now: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: number;
  userSettings: {
    pomodoroDailyGoal: number;
    quietHoursStart: string | null;
    quietHoursEnd: string | null;
  };
  todaySummary: Record<string, unknown>;
  pomodoroStats: Record<string, unknown>;
}

/**
 * LLM 建议输出结构
 */
interface SuggestionOutput {
  type: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  content: string;
  actionable: boolean;
  action?: {
    type: string;
    payload?: Record<string, unknown>;
  };
  timing: string;
}

/**
 * 主动建议服务
 * 负责：上下文感知 → LLM 推理 → 频率过滤 → 持久化 → 反馈闭环
 */
@Injectable()
export class ProactiveService {
  private readonly logger = new Logger(ProactiveService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LlmService,
    private readonly aiToolsService: AiToolsService,
  ) {}

  /* ═══════════════════════════════════════════════════════════════
     核心：生成主动建议
     ═══════════════════════════════════════════════════════════════ */

  async generateSuggestion(userId: string): Promise<unknown | null> {
    // 1. 获取用户设置
    const settings = await this.prisma.userSettings.findUnique({
      where: { userId },
    });
    if (!settings?.proactiveSuggestions) {
      this.logger.debug(`用户 ${userId} 关闭了主动建议`);
      return null;
    }

    // 2. 免打扰检查
    if (this.isInQuietHours(settings.quietHoursStart, settings.quietHoursEnd)) {
      this.logger.debug(`用户 ${userId} 处于免打扰时段`);
      return null;
    }

    // 3. 全局频率限制
    if (await this.isRateLimited(userId, settings.proactiveFrequency)) {
      this.logger.debug(`用户 ${userId} 已达建议频率上限`);
      return null;
    }

    // 4. 构建感知上下文
    const context = await this.buildContext(userId, settings);

    // 5. LLM 推理
    const prompt = this.buildPrompt(context);
    let llmResult: string;
    try {
      llmResult = await this.llmService.quickAsk(prompt, 800);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`LLM 调用失败: ${msg}`);
      return null;
    }

    // 6. 解析结构化输出
    const parsed = this.parseLlmResponse(llmResult);
    if (!parsed.shouldSuggest || !parsed.suggestion) {
      this.logger.debug(`LLM 判断无需建议: ${parsed.reasoning ?? '无推理'}`);
      return null;
    }

    // 7. 持久化
    const suggestion = await this.prisma.proactiveSuggestion.create({
      data: {
        userId,
        type: parsed.suggestion.type,
        priority: parsed.suggestion.priority,
        title: parsed.suggestion.title,
        content: parsed.suggestion.content,
        actionType: parsed.suggestion.action?.type ?? 'dismiss',
        actionPayload: (parsed.suggestion.action?.payload ?? null) as any,
        status: 'pending',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        context: context as any,
        reasoning: parsed.reasoning,
      },
    });

    this.logger.log(`为用户 ${userId} 生成建议: ${suggestion.type} / ${suggestion.priority}`);
    return suggestion;
  }

  /* ═══════════════════════════════════════════════════════════════
     查询：待展示建议列表
     ═══════════════════════════════════════════════════════════════ */

  async getPendingSuggestions(userId: string, limit = 20) {
    const now = new Date();
    const suggestions = await this.prisma.proactiveSuggestion.findMany({
      where: {
        userId,
        status: 'pending',
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // 按优先级排序：high > medium > low
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return suggestions.sort((a, b) => {
      const pa = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 3;
      const pb = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 3;
      return pa - pb;
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     反馈：接受 / 忽略 / 延后
     ═══════════════════════════════════════════════════════════════ */

  async submitFeedback(userId: string, suggestionId: string, action: string) {
    const suggestion = await this.prisma.proactiveSuggestion.findFirst({
      where: { id: suggestionId, userId },
    });
    if (!suggestion) {
      throw new Error('建议不存在');
    }

    const statusMap: Record<string, string> = {
      accepted: 'accepted',
      dismissed: 'dismissed',
      snoozed: 'pending',
    };

    return this.prisma.proactiveSuggestion.update({
      where: { id: suggestionId },
      data: {
        feedback: action,
        feedbackAt: new Date(),
        status: statusMap[action] ?? 'pending',
        // snoozed 时延长过期时间
        ...(action === 'snoozed'
          ? { expiresAt: new Date(Date.now() + 30 * 60 * 1000) }
          : {}),
      },
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     批量：一键忽略
     ═══════════════════════════════════════════════════════════════ */

  async dismissAll(userId: string) {
    const result = await this.prisma.proactiveSuggestion.updateMany({
      where: { userId, status: 'pending' },
      data: {
        status: 'dismissed',
        feedback: 'dismissed',
        feedbackAt: new Date(),
      },
    });
    return { dismissedCount: result.count };
  }

  /* ═══════════════════════════════════════════════════════════════
     统计：接受率 / 类型分布
     ═══════════════════════════════════════════════════════════════ */

  async getStats(userId: string) {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [total, pending, accepted, dismissed, weekTotal, weekAccepted] = await Promise.all([
      this.prisma.proactiveSuggestion.count({ where: { userId } }),
      this.prisma.proactiveSuggestion.count({ where: { userId, status: 'pending' } }),
      this.prisma.proactiveSuggestion.count({ where: { userId, status: 'accepted' } }),
      this.prisma.proactiveSuggestion.count({ where: { userId, status: 'dismissed' } }),
      this.prisma.proactiveSuggestion.count({ where: { userId, createdAt: { gte: weekAgo } } }),
      this.prisma.proactiveSuggestion.count({ where: { userId, status: 'accepted', feedbackAt: { gte: weekAgo } } }),
    ]);

    // 按类型统计近 7 天
    const byType = await this.prisma.proactiveSuggestion.groupBy({
      by: ['type'],
      where: { userId, createdAt: { gte: weekAgo } },
      _count: { id: true },
    });

    return {
      total,
      pending,
      accepted,
      dismissed,
      acceptedRate: total > 0 ? Math.round((accepted / total) * 100) : 0,
      weekAcceptedRate: weekTotal > 0 ? Math.round((weekAccepted / weekTotal) * 100) : 0,
      byType: byType.map((t) => ({ type: t.type, count: t._count.id })),
    };
  }

  /* ═══════════════════════════════════════════════════════════════
     私有：防打扰判断
     ═══════════════════════════════════════════════════════════════ */

  private isInQuietHours(start?: string | null, end?: string | null): boolean {
    if (!start || !end) return false;
    const now = new Date();
    const current = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;

    if (startMin < endMin) {
      return current >= startMin && current <= endMin;
    }
    // 跨午夜，如 23:00 - 08:00
    return current >= startMin || current <= endMin;
  }

  /* ═══════════════════════════════════════════════════════════════
     私有：频率限制
     ═══════════════════════════════════════════════════════════════ */

  private async isRateLimited(userId: string, frequency: string): Promise<boolean> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [hourCount, dayCount] = await Promise.all([
      this.prisma.proactiveSuggestion.count({
        where: { userId, createdAt: { gte: oneHourAgo } },
      }),
      this.prisma.proactiveSuggestion.count({
        where: { userId, createdAt: { gte: todayStart } },
      }),
    ]);

    // 根据用户设置频率调整上限
    const limits: Record<string, { perHour: number; perDay: number }> = {
      low: { perHour: 1, perDay: 3 },
      medium: { perHour: 2, perDay: 5 },
      high: { perHour: 3, perDay: 8 },
    };
    const limit = limits[frequency] ?? limits.medium;

    return hourCount >= limit.perHour || dayCount >= limit.perDay;
  }

  /* ═══════════════════════════════════════════════════════════════
     私有：构建感知上下文
     ═══════════════════════════════════════════════════════════════ */

  private async buildContext(userId: string, settings: any): Promise<ProactiveContext> {
    const now = new Date();
    const hour = now.getHours();
    let timeOfDay: ProactiveContext['timeOfDay'] = 'night';
    if (hour >= 6 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 18) timeOfDay = 'afternoon';
    else if (hour >= 18 && hour < 23) timeOfDay = 'evening';

    // 并行获取所有模块数据（复用现有工具）
    const [todaySummaryRaw, pomodoroStatsRaw] = await Promise.all([
      this.aiToolsService.execute('get_today_summary', {}, userId),
      this.aiToolsService.execute('get_pomodoro_stats', { period: 'today' }, userId),
    ]);

    return {
      now: now.toISOString(),
      timeOfDay,
      dayOfWeek: now.getDay(),
      userSettings: {
        pomodoroDailyGoal: settings.pomodoroDailyGoal ?? 8,
        quietHoursStart: settings.quietHoursStart,
        quietHoursEnd: settings.quietHoursEnd,
      },
      todaySummary: JSON.parse(todaySummaryRaw),
      pomodoroStats: JSON.parse(pomodoroStatsRaw),
    };
  }

  /* ═══════════════════════════════════════════════════════════════
     私有：Prompt 工程
     ═══════════════════════════════════════════════════════════════ */

  private buildPrompt(context: ProactiveContext): string {
    const ps = context.pomodoroStats.summary as Record<string, unknown> | undefined;
    const ts = context.todaySummary;
    const tasks = ts.tasks as Record<string, unknown> | undefined;

    return `你是 ResearchOS 的主动科研助手。请在合适的时机向用户发起有价值的建议。

## 核心原则
1. **不打扰优先**：如果用户当前可能正忙（番茄钟进行中、临近日程），不要发建议。
2. **价值优先**：只发对用户有明确帮助的建议，不发无意义的问候。
3. **简洁友好**：建议正文不超过 80 字，语气像一位贴心的研究伙伴。

## 建议类型（严格限制）
- focus_reminder: 最佳专注时段到来，但用户未开始番茄钟，且无临近日程冲突
- deadline_warning: 高优先级任务截止 < 24h，且状态不是 DONE（仅高优先级）
- break_suggestion: 连续专注 > 90min，或今日中断率 > 30%
- daily_brief: 每日固定时间简报（09:00 早间 / 21:00 晚间）
- pattern_insight: 基于行为数据的周期性洞察（每周仅 1 次）

## 输出格式（必须严格 JSON，不要 Markdown 代码块）
{"shouldSuggest": boolean, "suggestion": {"type": "...", "priority": "high|medium|low", "title": "15字以内", "content": "80字以内", "actionable": true, "action": {"type": "navigate|create_task|start_pomodoro|dismiss", "payload": {}}, "timing": "immediate|next_idle|scheduled"}, "reasoning": "一句话说明为什么发这条建议"}

## 当前上下文
- 时间: ${context.now}（${context.timeOfDay}）
- 番茄钟: 已完成 ${ps?.completedCount ?? 0}/${context.userSettings.pomodoroDailyGoal} 个，中断 ${ps?.interruptionCount ?? 0} 次
- 待办: ${(tasks?.todo as number) ?? 0} 项待开始，${(tasks?.inProgress as number) ?? 0} 项进行中
- 日程: ${(ts.events as Record<string, unknown>)?.count ?? 0} 场今日
- 高优先级待办: ${((tasks?.topPriority as string[]) ?? []).slice(0, 3).join('、') || '无'}

请判断：当前是否适合向用户发起一条主动建议？如适合，返回 JSON；如不适合，shouldSuggest 设为 false。`;
  }

  /* ═══════════════════════════════════════════════════════════════
     私有：解析 LLM 输出
     ═══════════════════════════════════════════════════════════════ */

  private parseLlmResponse(text: string): {
    shouldSuggest: boolean;
    suggestion?: SuggestionOutput;
    reasoning?: string;
  } {
    try {
      const cleaned = text
        .trim()
        .replace(/^```json\s*/, '')
        .replace(/^```\s*/, '')
        .replace(/```$/, '');
      return JSON.parse(cleaned);
    } catch {
      this.logger.warn(`LLM 返回非标准 JSON，忽略: ${text.slice(0, 200)}`);
      return { shouldSuggest: false };
    }
  }
}
