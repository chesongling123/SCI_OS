import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaService } from './prisma.service';

export type MockPrisma = DeepMockProxy<PrismaService>;

/**
 * 创建 PrismaService 的深度 Mock，用于单元测试
 */
export function createMockPrisma(): MockPrisma {
  return mockDeep<PrismaService>();
}
