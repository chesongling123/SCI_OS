import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import { CreateReferenceDto, UpdateReferenceDto, UpdateReadingStatusDto } from './dto';

@Injectable()
export class ReferenceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取文献列表（支持筛选和分页）
   */
  async findAll(userId: string, query: {
    status?: string;
    priority?: number;
    folderId?: string;
    tag?: string;
    q?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    cursor?: string;
  }) {
    const { status, priority, folderId, tag, q, sortBy = 'createdAt', sortOrder = 'desc', limit = 20, cursor } = query;

    const where: any = {
      userId,
      deletedAt: null,
      ...(status ? { readingStatus: status } : {}),
      ...(priority ? { priority } : {}),
      ...(folderId ? { folderId } : {}),
      ...(tag ? { tags: { has: tag } } : {}),
      ...(q ? {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { authors: { has: q } },
          { abstract: { contains: q, mode: 'insensitive' } },
          { tags: { has: q } },
        ],
      } : {}),
    };

    const items = await this.prisma.reference.findMany({
      where,
      take: Math.min(limit, 50),
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { [sortBy]: sortOrder },
    });

    const nextCursor = items.length === Math.min(limit, 50) ? items[items.length - 1]?.id : null;

    return {
      data: items,
      nextCursor,
      hasMore: !!nextCursor,
    };
  }

  /**
   * 获取单篇文献详情
   */
  async findOne(userId: string, id: string) {
    const reference = await this.prisma.reference.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        notes: {
          where: { deletedAt: null },
          orderBy: { pageNumber: 'asc' },
        },
        folder: true,
      },
    });

    if (!reference) {
      throw new NotFoundException(`文献 ${id} 不存在或已被删除`);
    }

    return reference;
  }

  /**
   * 创建文献（手动录入）
   */
  async create(userId: string, dto: CreateReferenceDto) {
    return this.prisma.reference.create({
      data: {
        title: dto.title,
        authors: dto.authors ?? [],
        year: dto.year,
        journal: dto.journal,
        volume: dto.volume,
        issue: dto.issue,
        pages: dto.pages,
        doi: dto.doi,
        url: dto.url,
        abstract: dto.abstract,
        keywords: dto.keywords ?? [],
        literatureType: (dto.literatureType ?? 'JOURNAL_ARTICLE') as any,
        tags: dto.tags ?? [],
        folderId: dto.folderId,
        priority: dto.priority ?? 3,
        userId,
      },
    });
  }

  /**
   * 更新文献
   */
  async update(userId: string, id: string, dto: UpdateReferenceDto) {
    await this.ensureExists(userId, id);

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.authors !== undefined) data.authors = dto.authors;
    if (dto.year !== undefined) data.year = dto.year;
    if (dto.journal !== undefined) data.journal = dto.journal;
    if (dto.volume !== undefined) data.volume = dto.volume;
    if (dto.issue !== undefined) data.issue = dto.issue;
    if (dto.pages !== undefined) data.pages = dto.pages;
    if (dto.doi !== undefined) data.doi = dto.doi;
    if (dto.url !== undefined) data.url = dto.url;
    if (dto.abstract !== undefined) data.abstract = dto.abstract;
    if (dto.abstractZh !== undefined) data.abstractZh = dto.abstractZh;
    if (dto.keywords !== undefined) data.keywords = dto.keywords;
    if (dto.literatureType !== undefined) data.literatureType = dto.literatureType;
    if (dto.readingStatus !== undefined) data.readingStatus = dto.readingStatus;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.rating !== undefined) data.rating = dto.rating;
    if (dto.tags !== undefined) data.tags = dto.tags;
    if (dto.folderId !== undefined) data.folderId = dto.folderId;

    return this.prisma.reference.update({
      where: { id },
      data,
    });
  }

  /**
   * 更新阅读状态
   */
  async updateStatus(userId: string, id: string, dto: UpdateReadingStatusDto) {
    await this.ensureExists(userId, id);

    return this.prisma.reference.update({
      where: { id },
      data: { readingStatus: dto.readingStatus as any },
    });
  }

  /**
   * 软删除文献
   */
  async remove(userId: string, id: string) {
    await this.ensureExists(userId, id);

    return this.prisma.reference.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * 上传 PDF 后更新文献文件信息
   */
  async updateFileInfo(userId: string, id: string, fileInfo: {
    filePath: string;
    fileSize: number;
    fileHash: string;
    thumbnailPath?: string;
  }) {
    await this.ensureExists(userId, id);

    return this.prisma.reference.update({
      where: { id },
      data: {
        filePath: fileInfo.filePath,
        fileSize: fileInfo.fileSize,
        fileHash: fileInfo.fileHash,
        ...(fileInfo.thumbnailPath ? { thumbnailPath: fileInfo.thumbnailPath } : {}),
      },
    });
  }

  // ========== 文献批注 ==========

  async findNotes(userId: string, referenceId: string) {
    await this.ensureExists(userId, referenceId);

    return this.prisma.referenceNote.findMany({
      where: { referenceId, deletedAt: null },
      orderBy: { pageNumber: 'asc' },
    });
  }

  async createNote(userId: string, referenceId: string, data: {
    pageNumber: number;
    rect?: object;
    text?: string;
    color?: string;
    content: string;
  }) {
    await this.ensureExists(userId, referenceId);

    return this.prisma.referenceNote.create({
      data: {
        pageNumber: data.pageNumber,
        rect: data.rect ?? null,
        text: data.text ?? null,
        color: data.color ?? '#FFD700',
        content: data.content,
        referenceId,
        userId,
      },
    });
  }

  // ========== 文件夹 ==========

  async findFolders(userId: string) {
    return this.prisma.referenceFolder.findMany({
      where: { userId, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createFolder(userId: string, dto: { name: string; parentId?: string }) {
    const lastFolder = await this.prisma.referenceFolder.findFirst({
      where: { userId, parentId: dto.parentId ?? null, deletedAt: null },
      orderBy: { sortOrder: 'desc' },
    });

    const sortOrder = (lastFolder?.sortOrder ?? -1) + 1;

    return this.prisma.referenceFolder.create({
      data: {
        name: dto.name,
        parentId: dto.parentId ?? null,
        sortOrder,
        userId,
      },
    });
  }

  async updateFolder(userId: string, id: string, dto: { name?: string; parentId?: string }) {
    const folder = await this.prisma.referenceFolder.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!folder) throw new NotFoundException(`文件夹 ${id} 不存在`);

    return this.prisma.referenceFolder.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId ?? null }),
      },
    });
  }

  async removeFolder(userId: string, id: string) {
    const folder = await this.prisma.referenceFolder.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!folder) throw new NotFoundException(`文件夹 ${id} 不存在`);

    // 将文件夹下的文献移出（folderId 设为 null）
    await this.prisma.reference.updateMany({
      where: { folderId: id, userId },
      data: { folderId: null },
    });

    return this.prisma.referenceFolder.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ========== 私有方法 ==========

  private async ensureExists(userId: string, id: string) {
    const reference = await this.prisma.reference.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!reference) {
      throw new NotFoundException(`文献 ${id} 不存在或已被删除`);
    }
  }
}
