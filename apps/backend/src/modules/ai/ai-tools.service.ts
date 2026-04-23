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
  {
    name: 'get_notes',
    description: '获取用户的笔记列表，支持按标签筛选',
    input_schema: {
      type: 'object' as const,
      properties: {
        tag: {
          type: 'string',
          description: '按标签筛选，不传则返回所有笔记',
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
    name: 'search_notes',
    description: '通过关键词搜索用户的笔记内容（标题+正文+摘要+标签）',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词',
        },
        limit: {
          type: 'number',
          description: '返回数量上限，默认 10',
          default: 10,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_note_detail',
    description: '获取单篇笔记的完整内容，用于深度分析或引用',
    input_schema: {
      type: 'object' as const,
      properties: {
        noteId: {
          type: 'string',
          description: '笔记 ID',
        },
      },
      required: ['noteId'],
    },
  },
  {
    name: 'create_note',
    description: '为用户创建一篇新笔记，将重要信息保存到笔记库中',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: '笔记标题，简洁概括内容',
        },
        content: {
          type: 'string',
          description: '笔记正文内容，支持 Markdown 格式',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: '标签列表，帮助分类和检索',
        },
        folderId: {
          type: 'string',
          description: '所属文件夹 ID，可选',
        },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'update_note',
    description: '更新或追加现有笔记的内容',
    input_schema: {
      type: 'object' as const,
      properties: {
        noteId: {
          type: 'string',
          description: '要更新的笔记 ID',
        },
        title: {
          type: 'string',
          description: '新标题，不修改则留空',
        },
        content: {
          type: 'string',
          description: '新正文内容，不修改则留空',
        },
        append: {
          type: 'boolean',
          description: '是否追加到现有内容末尾，默认 false（覆盖）',
          default: false,
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: '新标签列表，不修改则留空',
        },
      },
      required: ['noteId'],
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
        case 'get_notes':
          return await this.getNotes(userId, input);
        case 'search_notes':
          return await this.searchNotes(userId, input);
        case 'get_note_detail':
          return await this.getNoteDetail(userId, input);
        case 'create_note':
          return await this.createNote(userId, input);
        case 'update_note':
          return await this.updateNote(userId, input);
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

  // ===== 笔记工具 =====

  private async getNotes(userId: string, input: Record<string, unknown>): Promise<string> {
    const tag = input.tag as string | undefined;
    const limit = Math.min(Number(input.limit ?? 20), 50);

    const notes = await this.prisma.note.findMany({
      where: {
        userId,
        deletedAt: null,
        isArchived: false,
        ...(tag ? { tags: { has: tag } } : {}),
      },
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
      take: limit,
      select: {
        id: true,
        title: true,
        plainText: true,
        summary: true,
        tags: true,
        isPinned: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return JSON.stringify({
      count: notes.length,
      notes: notes.map((n) => ({
        ...n,
        preview: n.plainText.slice(0, 150),
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      })),
    });
  }

  private async searchNotes(userId: string, input: Record<string, unknown>): Promise<string> {
    const query = String(input.query ?? '').trim();
    const limit = Math.min(Number(input.limit ?? 10), 50);

    if (!query) {
      return JSON.stringify({ query, count: 0, notes: [] });
    }

    const notes = await this.prisma.note.findMany({
      where: {
        userId,
        deletedAt: null,
        isArchived: false,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { plainText: { contains: query, mode: 'insensitive' } },
          { summary: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        plainText: true,
        summary: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return JSON.stringify({
      query,
      count: notes.length,
      notes: notes.map((n) => ({
        id: n.id,
        title: n.title,
        preview: n.plainText.slice(0, 200),
        summary: n.summary,
        tags: n.tags,
        updatedAt: n.updatedAt.toISOString(),
      })),
    });
  }

  private async getNoteDetail(userId: string, input: Record<string, unknown>): Promise<string> {
    const noteId = String(input.noteId ?? '');

    const note = await this.prisma.note.findFirst({
      where: { id: noteId, userId, deletedAt: null },
      select: {
        id: true,
        title: true,
        content: true,
        plainText: true,
        summary: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!note) {
      return JSON.stringify({ error: '笔记不存在' });
    }

    return JSON.stringify({
      id: note.id,
      title: note.title,
      content: note.content,
      plainText: note.plainText,
      summary: note.summary,
      tags: note.tags,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    });
  }

  /**
   * 将 Markdown 文本转为 Tiptap JSON
   * 支持：标题、加粗、斜体、代码、代码块、无序列表、有序列表、任务列表、引用、表格
   */
  private markdownToTiptap(text: string): Record<string, unknown> {
    const lines = text.split('\n');
    const content: Record<string, unknown>[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.length === 0) {
        i++;
        continue;
      }

      // 代码块 ```
      if (trimmed.startsWith('```')) {
        const lang = trimmed.slice(3).trim();
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // 跳过结束的 ```
        content.push({
          type: 'codeBlock',
          attrs: lang ? { language: lang } : {},
          content: [{ type: 'text', text: codeLines.join('\n') }],
        });
        continue;
      }

      // 标题
      const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        content.push({
          type: 'heading',
          attrs: { level },
          content: this.parseInlineMarks(headingMatch[2]),
        });
        i++;
        continue;
      }

      // 表格
      if (trimmed.includes('|') && i + 1 < lines.length && lines[i + 1].trim().includes('|') && lines[i + 1].trim().match(/[:\-]/)) {
        const rows: string[][] = [];
        // 表头
        rows.push(trimmed.split('|').map((c) => c.trim()).filter((c) => c.length > 0));
        i++; // 跳过分隔行
        i++;
        // 数据行
        while (i < lines.length && lines[i].trim().includes('|')) {
          rows.push(lines[i].trim().split('|').map((c) => c.trim()).filter((c) => c.length > 0));
          i++;
        }
        const tableContent: Record<string, unknown>[] = [];
        if (rows.length > 0) {
          tableContent.push({
            type: 'tableRow',
            content: rows[0].map((cell) => ({
              type: 'tableHeader',
              content: [{ type: 'paragraph', content: this.parseInlineMarks(cell) }],
            })),
          });
          for (let r = 1; r < rows.length; r++) {
            tableContent.push({
              type: 'tableRow',
              content: rows[r].map((cell) => ({
                type: 'tableCell',
                content: [{ type: 'paragraph', content: this.parseInlineMarks(cell) }],
              })),
            });
          }
        }
        content.push({ type: 'table', content: tableContent });
        continue;
      }

      // 任务列表
      const taskMatch = trimmed.match(/^[-*+]\s+\[([ xX])\]\s+(.+)$/);
      if (taskMatch) {
        const taskItems: Record<string, unknown>[] = [];
        while (i < lines.length) {
          const ti = lines[i].trim();
          const tm = ti.match(/^[-*+]\s+\[([ xX])\]\s+(.+)$/);
          if (tm) {
            taskItems.push({
              type: 'taskItem',
              attrs: { checked: tm[1] === 'x' || tm[1] === 'X' },
              content: [{
                type: 'paragraph',
                content: this.parseInlineMarks(tm[2]),
              }],
            });
            i++;
          } else if (ti.length === 0) {
            i++;
          } else {
            break;
          }
        }
        content.push({ type: 'taskList', content: taskItems });
        continue;
      }

      // 无序列表
      if (trimmed.match(/^[-*+]\s/)) {
        const listItems: Record<string, unknown>[] = [];
        while (i < lines.length) {
          const li = lines[i].trim();
          if (li.match(/^[-*+]\s/)) {
            listItems.push({
              type: 'listItem',
              content: [{
                type: 'paragraph',
                content: this.parseInlineMarks(li.replace(/^[-*+]\s+/, '')),
              }],
            });
            i++;
          } else if (li.length === 0) {
            i++;
          } else {
            break;
          }
        }
        content.push({ type: 'bulletList', content: listItems });
        continue;
      }

      // 有序列表
      if (trimmed.match(/^\d+\.\s/)) {
        const listItems: Record<string, unknown>[] = [];
        while (i < lines.length) {
          const li = lines[i].trim();
          if (li.match(/^\d+\.\s/)) {
            listItems.push({
              type: 'listItem',
              content: [{
                type: 'paragraph',
                content: this.parseInlineMarks(li.replace(/^\d+\.\s+/, '')),
              }],
            });
            i++;
          } else if (li.length === 0) {
            i++;
          } else {
            break;
          }
        }
        content.push({ type: 'orderedList', content: listItems });
        continue;
      }

      // 引用
      if (trimmed.startsWith('>')) {
        const quoteLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('>')) {
          quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
          i++;
        }
        content.push({
          type: 'blockquote',
          content: [{
            type: 'paragraph',
            content: this.parseInlineMarks(quoteLines.join(' ')),
          }],
        });
        continue;
      }

      // 普通段落
      content.push({
        type: 'paragraph',
        content: this.parseInlineMarks(trimmed),
      });
      i++;
    }

    return {
      type: 'doc',
      content: content.length > 0 ? content : [{ type: 'paragraph' }],
    };
  }

  /**
   * 解析行内标记：加粗、斜体、代码
   */
  private parseInlineMarks(text: string): Record<string, unknown>[] {
    const result: Record<string, unknown>[] = [];
    // 按 **加粗**、*斜体*、__斜体__、`代码` 分割
    const regex = /(\*\*[\s\S]+?\*\*|\*[\s\S]+?\*|_[\s\S]+?_|`[\s\S]+?`)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      // 普通文本
      if (match.index > lastIndex) {
        result.push({ type: 'text', text: text.slice(lastIndex, match.index) });
      }

      const token = match[1];
      if (token.startsWith('**') && token.endsWith('**')) {
        result.push({
          type: 'text',
          text: token.slice(2, -2),
          marks: [{ type: 'bold' }],
        });
      } else if (token.startsWith('*') && token.endsWith('*')) {
        result.push({
          type: 'text',
          text: token.slice(1, -1),
          marks: [{ type: 'italic' }],
        });
      } else if (token.startsWith('_') && token.endsWith('_')) {
        result.push({
          type: 'text',
          text: token.slice(1, -1),
          marks: [{ type: 'italic' }],
        });
      } else if (token.startsWith('`') && token.endsWith('`')) {
        result.push({
          type: 'text',
          text: token.slice(1, -1),
          marks: [{ type: 'code' }],
        });
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      result.push({ type: 'text', text: text.slice(lastIndex) });
    }

    return result.length > 0 ? result : [{ type: 'text', text }];
  }

  private async createNote(userId: string, input: Record<string, unknown>): Promise<string> {
    const title = String(input.title ?? '').trim();
    const contentText = String(input.content ?? '').trim();
    const tags = Array.isArray(input.tags) ? input.tags.filter((t): t is string => typeof t === 'string') : [];
    const folderId = input.folderId ? String(input.folderId) : null;

    if (!title || !contentText) {
      return JSON.stringify({ error: '标题和内容不能为空' });
    }

    const tiptapContent = this.markdownToTiptap(contentText);

    const note = await this.prisma.note.create({
      data: {
        userId,
        title,
        content: tiptapContent as any,
        plainText: contentText,
        tags,
        folderId,
      },
    });

    return JSON.stringify({
      success: true,
      id: note.id,
      title: note.title,
      message: `笔记「${note.title}」已创建`,
    });
  }

  private async updateNote(userId: string, input: Record<string, unknown>): Promise<string> {
    const noteId = String(input.noteId ?? '');
    const newTitle = input.title ? String(input.title).trim() : undefined;
    const newContentText = input.content ? String(input.content).trim() : undefined;
    const append = Boolean(input.append ?? false);
    const newTags = Array.isArray(input.tags) ? input.tags.filter((t): t is string => typeof t === 'string') : undefined;

    const existing = await this.prisma.note.findFirst({
      where: { id: noteId, userId, deletedAt: null },
    });

    if (!existing) {
      return JSON.stringify({ error: '笔记不存在或无权限' });
    }

    const data: Record<string, unknown> = {};

    if (newTitle !== undefined && newTitle.length > 0) {
      data.title = newTitle;
    }

    if (newContentText !== undefined) {
      if (append) {
        // 追加模式
        const combinedPlainText = existing.plainText + '\n\n' + newContentText;
        data.plainText = combinedPlainText;
        data.content = this.markdownToTiptap(combinedPlainText) as any;
      } else {
        // 覆盖模式
        data.plainText = newContentText;
        data.content = this.markdownToTiptap(newContentText) as any;
      }
    }

    if (newTags !== undefined) {
      data.tags = newTags;
    }

    const note = await this.prisma.note.update({
      where: { id: noteId },
      data,
    });

    return JSON.stringify({
      success: true,
      id: note.id,
      title: note.title,
      message: `笔记「${note.title}」已更新`,
    });
  }
}
