import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import { CreateNoteDto, UpdateNoteDto, SearchNoteDto } from './dto';
import { CreateNoteFolderDto, UpdateNoteFolderDto } from './dto';

@Injectable()
export class NoteService {
  private readonly logger = new Logger(NoteService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取用户的笔记列表
   */
  async findAll(userId: string, options: { folderId?: string; tag?: string; archived?: boolean; limit?: number } = {}) {
    const { folderId, tag, archived = false, limit = 50 } = options;

    const notes = await this.prisma.note.findMany({
      where: {
        userId,
        deletedAt: null,
        isArchived: archived,
        ...(folderId ? { folderId } : { folderId: null }),
        ...(tag ? { tags: { has: tag } } : {}),
      },
      orderBy: [
        { isPinned: 'desc' },
        { updatedAt: 'desc' },
      ],
      take: limit,
      select: {
        id: true,
        title: true,
        plainText: true,
        summary: true,
        tags: true,
        folderId: true,
        isPinned: true,
        isArchived: true,
        createdAt: true,
        updatedAt: true,
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
      },
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
    if (dto.isPinned !== undefined) data.isPinned = dto.isPinned;
    if (dto.isArchived !== undefined) data.isArchived = dto.isArchived;

    const note = await this.prisma.note.update({
      where: { id },
      data,
    });

    return {
      ...note,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    };
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
      select: {
        id: true,
        title: true,
        plainText: true,
        summary: true,
        tags: true,
        folderId: true,
        isPinned: true,
        isArchived: true,
        createdAt: true,
        updatedAt: true,
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
}
