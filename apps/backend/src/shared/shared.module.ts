import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { EmbeddingService } from './embedding.service';
import { DoiImporterService } from './doi-importer.service';
import { CitationService } from './citation.service';
import { RedisService } from './redis.service';

/**
 * 共享模块
 * 全局导出 PrismaService、EmbeddingService、RedisService 等通用能力，所有模块无需重复导入
 */
@Global()
@Module({
  providers: [PrismaService, EmbeddingService, DoiImporterService, CitationService, RedisService],
  exports: [PrismaService, EmbeddingService, DoiImporterService, CitationService, RedisService],
})
export class SharedModule {}
