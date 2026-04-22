import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import { CreateTaskDto, UpdateTaskDto, MoveTaskDto } from './dto';
import { TaskStatus } from '@phd/shared-types';

@Injectable()
export class TaskService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, status?: TaskStatus) {
    return this.prisma.task.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(status ? { status } : {}),
      },
      orderBy: [{ status: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async create(userId: string, dto: CreateTaskDto) {
    const lastTask = await this.prisma.task.findFirst({
      where: { status: dto.status ?? TaskStatus.TODO, deletedAt: null },
      orderBy: { sortOrder: 'desc' },
    });

    const sortOrder = (lastTask?.sortOrder ?? -1) + 1;

    return this.prisma.task.create({
      data: {
        title: dto.title,
        status: dto.status ?? TaskStatus.TODO,
        priority: dto.priority ?? 4,
        sortOrder,
        pomodoroCount: dto.pomodoroCount ?? 0,
        userId,
      } as any,
    });
  }

  async update(userId: string, id: string, dto: UpdateTaskDto) {
    await this.ensureExists(userId, id);

    return this.prisma.task.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
        ...(dto.pomodoroCount !== undefined && { pomodoroCount: dto.pomodoroCount }),
      },
    });
  }

  async move(userId: string, id: string, dto: MoveTaskDto) {
    await this.ensureExists(userId, id);

    return this.prisma.task.update({
      where: { id },
      data: {
        status: dto.status,
        sortOrder: dto.sortOrder,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.ensureExists(userId, id);

    return this.prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async ensureExists(userId: string, id: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!task) {
      throw new NotFoundException(`任务 ${id} 不存在或已被删除`);
    }
  }
}
