import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { EmbeddingService } from './embedding.service';

/**
 * 共享模块
 * 全局导出 PrismaService、EmbeddingService 等通用能力，所有模块无需重复导入
 */
@Global()
@Module({
  providers: [PrismaService, EmbeddingService],
  exports: [PrismaService, EmbeddingService],
})
export class SharedModule {}
