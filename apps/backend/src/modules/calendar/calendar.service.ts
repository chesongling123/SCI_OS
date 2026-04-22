import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import { CreateEventDto, UpdateEventDto } from './dto';

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, startFrom?: string, startTo?: string) {
    return this.prisma.event.findMany({
      where: {
        userId,
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

  async findOne(userId: string, id: string) {
    const event = await this.prisma.event.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!event) throw new NotFoundException(`事件 ${id} 不存在`);
    return event;
  }

  async create(userId: string, dto: CreateEventDto) {
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
        userId,
      } as any,
    });
  }

  async update(userId: string, id: string, dto: UpdateEventDto) {
    await this.findOne(userId, id);

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

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.event.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
