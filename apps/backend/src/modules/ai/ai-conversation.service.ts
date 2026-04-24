import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class AiConversationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建新对话
   */
  async create(userId: string, title?: string) {
    return this.prisma.aiConversation.create({
      data: {
        userId,
        title: title || '新对话',
      },
    });
  }

  /**
   * 获取用户的对话列表（按更新时间倒序）
   */
  async findAll(userId: string) {
    return this.prisma.aiConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });
  }

  /**
   * 获取单个对话详情（含消息）
   */
  async findOne(userId: string, id: string) {
    const conversation = await this.prisma.aiConversation.findFirst({
      where: { id, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('对话不存在');
    }

    return conversation;
  }

  /**
   * 更新对话标题
   */
  async updateTitle(userId: string, id: string, title: string) {
    const conversation = await this.prisma.aiConversation.findFirst({
      where: { id, userId },
    });

    if (!conversation) {
      throw new NotFoundException('对话不存在');
    }

    return this.prisma.aiConversation.update({
      where: { id },
      data: { title },
    });
  }

  /**
   * 删除对话（级联删除消息）
   */
  async remove(userId: string, id: string) {
    const conversation = await this.prisma.aiConversation.findFirst({
      where: { id, userId },
    });

    if (!conversation) {
      throw new NotFoundException('对话不存在');
    }

    return this.prisma.aiConversation.delete({
      where: { id },
    });
  }

  /**
   * 保存用户消息
   */
  async saveUserMessage(conversationId: string, content: string) {
    return this.prisma.aiMessage.create({
      data: {
        conversationId,
        role: 'USER',
        content,
      },
    });
  }

  /**
   * 保存助手消息
   */
  async saveAssistantMessage(
    conversationId: string,
    content: string,
    toolCalls?: unknown[],
  ) {
    return this.prisma.aiMessage.create({
      data: {
        conversationId,
        role: 'ASSISTANT',
        content,
        toolCalls: toolCalls ? (toolCalls as any) : undefined,
      },
    });
  }

  /**
   * 加载对话历史（最近 N 条）用于构建 LLM 上下文
   */
  async loadHistory(conversationId: string, take = 20) {
    return this.prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take,
    });
  }

  /**
   * 更新对话的 updatedAt（用于排序）
   */
  async touch(conversationId: string) {
    return this.prisma.aiConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
  }
}
