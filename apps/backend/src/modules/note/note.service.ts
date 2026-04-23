import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import { EmbeddingService } from '../../shared/embedding.service';
import { CreateNoteDto, UpdateNoteDto, SearchNoteDto } from './dto';
import { CreateNoteFolderDto, UpdateNoteFolderDto } from './dto';

@Injectable()
export class NoteService {
  private readonly logger = new Logger(NoteService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embedding: EmbeddingService,
  ) {}

  /**
   * 获取用户的笔记列表
   */
  async findAll(userId: string, options: { folderId?: string; tag?: string; archived?: boolean; referenceId?: string; limit?: number } = {}) {
    const { folderId, tag, archived = false, referenceId, limit = 50 } = options;

    const notes = await this.prisma.note.findMany({
      where: {
        userId,
        deletedAt: null,
        isArchived: archived,
        ...(folderId ? { folderId } : { folderId: null }),
        ...(tag ? { tags: { has: tag } } : {}),
        ...(referenceId ? { referenceId } : {}),
      },
      orderBy: [
        { isPinned: 'desc' },
        { updatedAt: 'desc' },
      ],
      take: limit,
      include: {
        reference: {
          select: { id: true, title: true },
        },
      },
    });

    return notes.map((n) => ({
      ...n,
      plainText: n.plainText.slice(0, 200), // 列表只返回前200字预览
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    }));
  }

  /**
   * 获取单篇笔记详情
   */
  async findOne(userId: string, id: string) {
    const note = await this.prisma.note.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        reference: {
          select: { id: true, title: true },
        },
      },
    });

    if (!note) {
      throw new NotFoundException('笔记不存在');
    }

    return {
      ...note,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    };
  }

  /**
   * 创建笔记
   */
  async create(userId: string, dto: CreateNoteDto) {
    const note = await this.prisma.note.create({
      data: {
        userId,
        title: dto.title,
        content: dto.content as any,
        plainText: dto.plainText,
        tags: dto.tags ?? [],
        folderId: dto.folderId ?? null,
        referenceId: dto.referenceId ?? null,
      },
      include: {
        reference: {
          select: { id: true, title: true },
        },
      },
    });

    // 异步生成语义向量（不阻塞用户响应）
    this.generateEmbedding(note.id, dto.title, dto.plainText).catch((err) => {
      this.logger.warn(`笔记 ${note.id} embedding 生成失败: ${err.message}`);
    });

    return {
      ...note,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    };
  }

  /**
   * 更新笔记
   */
  async update(userId: string, id: string, dto: UpdateNoteDto) {
    const existing = await this.prisma.note.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('笔记不存在');
    }

    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.content !== undefined) data.content = dto.content as any;
    if (dto.plainText !== undefined) data.plainText = dto.plainText;
    if (dto.tags !== undefined) data.tags = dto.tags;
    if (dto.folderId !== undefined) data.folderId = dto.folderId;
    if (dto.referenceId !== undefined) data.referenceId = dto.referenceId ?? null;
    if (dto.isPinned !== undefined) data.isPinned = dto.isPinned;
    if (dto.isArchived !== undefined) data.isArchived = dto.isArchived;

    const note = await this.prisma.note.update({
      where: { id },
      data,
      include: {
        reference: {
          select: { id: true, title: true },
        },
      },
    });

    // 内容变化时重新生成 embedding
    if (dto.title !== undefined || dto.plainText !== undefined) {
      this.generateEmbedding(id, note.title, note.plainText).catch((err) => {
        this.logger.warn(`笔记 ${id} embedding 更新失败: ${err.message}`);
      });
    }

    return {
      ...note,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    };
  }

  /**
   * 语义搜索笔记（基于向量相似度）
   */
  async semanticSearch(userId: string, query: string, limit = 10) {
    const embedding = await this.embedding.embedText(query);
    if (!embedding) {
      this.logger.warn('Embedding 服务不可用，语义搜索降级为全文搜索');
      return this.search(userId, { q: query, limit });
    }

    const vectorStr = `[${embedding.join(',')}]`;

    // 使用 pgvector 余弦距离（<=>），值越小越相似
    const results = await this.prisma.$queryRaw<Array<{
      id: string;
      title: string;
      plainText: string;
      summary: string | null;
      tags: string[];
      distance: number;
    }>>`
      SELECT id, title, plain_text as "plainText", summary, tags,
             embedding <=> ${vectorStr}::vector AS distance
      FROM notes
      WHERE user_id = ${userId}
        AND deleted_at IS NULL
        AND is_archived = false
        AND embedding IS NOT NULL
      ORDER BY distance ASC
      LIMIT ${limit}
    `;

    return results.map((r) => ({
      id: r.id,
      title: r.title,
      plainText: r.plainText.slice(0, 200),
      summary: r.summary,
      tags: r.tags,
      similarityScore: Math.max(0, Math.round((1 - r.distance) * 100)), // 转为 0-100 分
    }));
  }

  /**
   * 软删除笔记
   */
  async remove(userId: string, id: string) {
    const existing = await this.prisma.note.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('笔记不存在');
    }

    await this.prisma.note.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { id, deleted: true };
  }

  /**
   * 搜索笔记
   * 使用 ILIKE 模糊匹配 + 标签匹配
   */
  async search(userId: string, dto: SearchNoteDto) {
    const { q, tag, limit = 20 } = dto;
    const query = q.trim();

    // 使用 Prisma 的 AND + OR 组合实现多字段 ILIKE
    const notes = await this.prisma.note.findMany({
      where: {
        userId,
        deletedAt: null,
        isArchived: false,
        AND: [
          {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { plainText: { contains: query, mode: 'insensitive' } },
              { summary: { contains: query, mode: 'insensitive' } },
            ],
          },
          ...(tag ? [{ tags: { has: tag } }] : []),
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: {
        reference: {
          select: { id: true, title: true },
        },
      },
    });

    return notes.map((n) => ({
      ...n,
      plainText: n.plainText.slice(0, 200),
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    }));
  }

  // ===== 文件夹 =====

  async findFolders(userId: string) {
    const folders = await this.prisma.noteFolder.findMany({
      where: { userId, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        parentId: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return folders.map((f) => ({
      ...f,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    }));
  }

  async createFolder(userId: string, dto: CreateNoteFolderDto) {
    const folder = await this.prisma.noteFolder.create({
      data: {
        userId,
        name: dto.name,
        parentId: dto.parentId ?? null,
      },
    });
    return {
      ...folder,
      createdAt: folder.createdAt.toISOString(),
      updatedAt: folder.updatedAt.toISOString(),
    };
  }

  async updateFolder(userId: string, id: string, dto: UpdateNoteFolderDto) {
    const existing = await this.prisma.noteFolder.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('文件夹不存在');

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.parentId !== undefined) data.parentId = dto.parentId;

    const folder = await this.prisma.noteFolder.update({
      where: { id },
      data,
    });
    return {
      ...folder,
      createdAt: folder.createdAt.toISOString(),
      updatedAt: folder.updatedAt.toISOString(),
    };
  }

  async removeFolder(userId: string, id: string) {
    const existing = await this.prisma.noteFolder.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('文件夹不存在');

    const noteCount = await this.prisma.note.count({
      where: { folderId: id, deletedAt: null },
    });
    if (noteCount > 0) {
      throw new Error('文件夹不为空，无法删除');
    }

    await this.prisma.noteFolder.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { id, deleted: true };
  }

  // ========== 语义向量生成 ==========

  private async generateEmbedding(noteId: string, title: string, plainText: string) {
    const textToEmbed = `${title}\n${plainText}`.slice(0, 4000); // 限制长度避免超限
    const embedding = await this.embedding.embedText(textToEmbed);
    if (!embedding) return;

    const vectorStr = `[${embedding.join(',')}]`;
    await this.prisma.$executeRaw`
      UPDATE notes
      SET embedding = ${vectorStr}::vector
      WHERE id = ${noteId}
    `;
    this.logger.debug(`笔记 ${noteId} embedding 已生成`);
  }
}
