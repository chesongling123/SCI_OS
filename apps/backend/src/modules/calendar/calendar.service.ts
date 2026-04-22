import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import { CreateEventDto, UpdateEventDto } from './dto';

/**
 * 日程服务
 * 职责：事件 CRUD、RRULE 展开、时区处理
 */
@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取事件列表
   * 支持时间范围过滤，默认排除已软删除的事件
   */
  async findAll(startFrom?: string, startTo?: string) {
    return this.prisma.event.findMany({
      where: {
        deletedAt: null,
        ...(startFrom || startTo
          ? {
              startAt: {
                ...(startFrom ? { gte: new Date(startFrom) } : {}),
                ...(startTo ? { lte: new Date(startTo) } : {}),
              },
            }
          : {}),
      },
      orderBy: { startAt: 'asc' },
    });
  }

  /**
   * 获取单个事件
   */
  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id, deletedAt: null },
    });
    if (!event) throw new NotFoundException(`事件 ${id} 不存在`);
    return event;
  }

  /**
   * 创建事件
   */
  async create(dto: CreateEventDto) {
    // Phase 1：自动关联默认用户
    const defaultUser = await this.prisma.user.upsert({
      where: { email: 'demo@phd-os.local' },
      update: {},
      create: { email: 'demo@phd-os.local', name: '演示用户' },
    });

    return this.prisma.event.create({
      data: {
        title: dto.title,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        timezone: dto.timezone ?? 'Asia/Shanghai',
        rrule: dto.rrule ?? null,
        isAllDay: dto.isAllDay ?? false,
        location: dto.location ?? null,
        description: dto.description ?? null,
        color: dto.color ?? null,
        userId: defaultUser.id,
      } as any,
    });
  }

  /**
   * 更新事件
   */
  async update(id: string, dto: UpdateEventDto) {
    await this.findOne(id);

    return this.prisma.event.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.startAt !== undefined && { startAt: new Date(dto.startAt) }),
        ...(dto.endAt !== undefined && { endAt: new Date(dto.endAt) }),
        ...(dto.timezone !== undefined && { timezone: dto.timezone }),
        ...(dto.rrule !== undefined && { rrule: dto.rrule }),
        ...(dto.isAllDay !== undefined && { isAllDay: dto.isAllDay }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.color !== undefined && { color: dto.color }),
      },
    });
  }

  /**
   * 软删除事件
   */
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.event.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
