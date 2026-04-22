import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import { CreateTaskDto, UpdateTaskDto, MoveTaskDto } from './dto';
import { TaskStatus } from '@phd/shared-types';

/**
 * 任务服务
 * 职责：任务 CRUD、拖拽排序、软删除
 */
@Injectable()
export class TaskService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取任务列表，按状态分组、排序位置排序
   * 支持按状态过滤，默认排除已软删除的任务
   */
  async findAll(status?: TaskStatus) {
    return this.prisma.task.findMany({
      where: {
        deletedAt: null,
        ...(status ? { status } : {}),
      },
      orderBy: [{ status: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  /**
   * 创建任务
   * 自动计算 sortOrder（放到对应状态列的末尾）
   */
  async create(dto: CreateTaskDto) {
    // Phase 1：自动创建/获取默认用户（TODO: Phase 2 接入真实认证）
    const defaultUser = await this.prisma.user.upsert({
      where: { email: 'demo@phd-os.local' },
      update: {},
      create: { email: 'demo@phd-os.local', name: '演示用户' },
    });

    // 获取当前状态列的最大 sortOrder
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
        userId: defaultUser.id,
      } as any,
    });
  }

  /**
   * 更新任务
   */
  async update(id: string, dto: UpdateTaskDto) {
    await this.ensureExists(id);

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

  /**
   * 拖拽移动任务（跨列/同列重排）
   * 核心接口：更新状态 + 排序位置
   */
  async move(id: string, dto: MoveTaskDto) {
    await this.ensureExists(id);

    return this.prisma.task.update({
      where: { id },
      data: {
        status: dto.status,
        sortOrder: dto.sortOrder,
      },
    });
  }

  /**
   * 软删除任务
   */
  async remove(id: string) {
    await this.ensureExists(id);

    return this.prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * 确保任务存在且未被删除
   */
  private async ensureExists(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id, deletedAt: null },
    });
    if (!task) {
      throw new NotFoundException(`任务 ${id} 不存在或已被删除`);
    }
  }
}
