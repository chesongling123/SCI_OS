import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * 共享模块
 * 全局导出 PrismaService 等通用能力，所有模块无需重复导入
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class SharedModule {}
