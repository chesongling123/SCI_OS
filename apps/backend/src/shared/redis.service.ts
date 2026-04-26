import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * Redis 服务
 * 封装 ioredis 连接，提供 get/set/del 等常用操作
 * 供各模块注入使用（天气缓存、会话存储、队列等）
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  onModuleInit() {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);
    const password = process.env.REDIS_PASSWORD || undefined;

    this.client = new Redis({
      host,
      port,
      password,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: 3,
    });

    this.client.on('error', (err) => {
      // 静默处理 Redis 连接错误，避免阻塞主服务
      // 无 Redis 时自动降级为无缓存模式
      console.warn('[Redis] 连接异常:', err.message);
    });
  }

  onModuleDestroy() {
    this.client?.disconnect();
  }

  /** 获取 Redis 原生客户端（高级操作） */
  getClient(): Redis {
    return this.client;
  }

  /** 获取字符串值 */
  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  /** 设置字符串值，支持 TTL（秒） */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch {
      // 静默失败，降级为无缓存
    }
  }

  /** 删除键 */
  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch {
      // 静默失败
    }
  }
}
