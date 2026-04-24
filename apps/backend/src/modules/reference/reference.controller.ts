import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, Request, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MulterFile = any;
import { ReferenceService } from './reference.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CreateReferenceDto,
  UpdateReferenceDto,
  UpdateReadingStatusDto,
  CreateReferenceFolderDto,
  UpdateReferenceFolderDto,
} from './dto';

@ApiTags('文献管理')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('references')
export class ReferenceController {
  constructor(private readonly referenceService: ReferenceService) {}

  @Get()
  @ApiOperation({ summary: '获取文献列表' })
  @ApiResponse({ status: 200, description: '返回文献列表' })
  findAll(
    @Request() req: { user: { id: string } },
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('folderId') folderId?: string,
    @Query('tag') tag?: string,
    @Query('q') q?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.referenceService.findAll(req.user.id, {
      status,
      priority: priority ? parseInt(priority, 10) : undefined,
      folderId,
      tag,
      q,
      sortBy,
      sortOrder,
      limit: limit ? parseInt(limit, 10) : 20,
      cursor,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: '获取文献详情' })
  @ApiResponse({ status: 200, description: '返回文献详情' })
  @ApiResponse({ status: 404, description: '文献不存在' })
  findOne(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.referenceService.findOne(req.user.id, id);
  }

  @Post()
  @ApiOperation({ summary: '创建文献（手动录入）' })
  @ApiResponse({ status: 201, description: '文献创建成功' })
  create(@Request() req: { user: { id: string } }, @Body() dto: CreateReferenceDto) {
    return this.referenceService.create(req.user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新文献' })
  @ApiResponse({ status: 200, description: '文献更新成功' })
  @ApiResponse({ status: 404, description: '文献不存在' })
  update(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: UpdateReferenceDto,
  ) {
    return this.referenceService.update(req.user.id, id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '更新阅读状态' })
  @ApiResponse({ status: 200, description: '状态更新成功' })
  updateStatus(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: UpdateReadingStatusDto,
  ) {
    return this.referenceService.updateStatus(req.user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '软删除文献' })
  @ApiResponse({ status: 200, description: '文献删除成功' })
  @ApiResponse({ status: 404, description: '文献不存在' })
  remove(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.referenceService.remove(req.user.id, id);
  }

  // ========== DOI 导入 ==========

  @Post('import-doi')
  @ApiOperation({ summary: '通过 DOI 导入文献（CrossRef）' })
  @ApiResponse({ status: 201, description: '文献导入成功' })
  @ApiResponse({ status: 400, description: 'DOI 无效或解析失败' })
  async importByDoi(
    @Request() req: { user: { id: string } },
    @Body() body: { doi: string },
  ) {
    return this.referenceService.importByDoi(req.user.id, body.doi);
  }

  // ========== 引用导出 ==========

  @Post(':id/export-citation')
  @ApiOperation({ summary: '导出文献引用格式（BibTeX / GB7714 / APA / MLA）' })
  @ApiResponse({ status: 200, description: '返回格式化引用文本' })
  @ApiResponse({ status: 404, description: '文献不存在' })
  async exportCitation(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() body: { format: 'bibtex' | 'gb7714' | 'apa' | 'mla' | 'chicago' },
  ) {
    const citation = await this.referenceService.exportCitation(req.user.id, id, body.format);
    return { format: body.format, citation };
  }

  // ========== 文件上传 ==========

  @Post('upload')
  @ApiOperation({ summary: '上传 PDF 文件' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        folderId: { type: 'string' },
        tags: { type: 'string' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/papers',
      filename: (req, file, cb) => {
        const userId = (req as any).user?.id ?? 'unknown';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${userId}-${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('仅支持 PDF 文件'), false);
      }
    },
  }))
  async uploadPdf(
    @Request() req: { user: { id: string } },
    @UploadedFile() file: MulterFile,
    @Body('folderId') folderId?: string,
    @Body('tags') tags?: string,
  ) {
    // 先创建文献记录（标题先用文件名）
    const reference = await this.referenceService.create(req.user.id, {
      title: file.originalname.replace(/\.pdf$/i, ''),
      folderId,
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
    });

    // 计算文件 SHA-256 并更新文件信息
    const fileBuffer = readFileSync(join('./uploads/papers', file.filename));
    const fileHash = createHash('sha256').update(fileBuffer).digest('hex');
    await this.referenceService.updateFileInfo(req.user.id, reference.id, {
      filePath: file.filename,
      fileSize: file.size,
      fileHash,
    });

    return this.referenceService.findOne(req.user.id, reference.id);
  }

  // ========== 文献批注 ==========

  @Get(':id/notes')
  @ApiOperation({ summary: '获取文献批注列表' })
  findNotes(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.referenceService.findNotes(req.user.id, id);
  }

  @Post(':id/notes')
  @ApiOperation({ summary: '添加批注' })
  createNote(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() data: { pageNumber: number; rect?: object; text?: string; color?: string; content: string },
  ) {
    return this.referenceService.createNote(req.user.id, id, data);
  }

  // ========== 文件夹 ==========

  @Get('semantic-search')
  @ApiOperation({ summary: '语义检索文献（基于 Embedding 向量相似度）' })
  @ApiResponse({ status: 200, description: '返回语义相关文献列表' })
  semanticSearch(
    @Request() req: { user: { id: string } },
    @Query('q') q: string,
    @Query('limit') limit?: string,
  ) {
    return this.referenceService.semanticSearch(
      req.user.id,
      q,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('folders/all')
  @ApiOperation({ summary: '获取文献文件夹列表' })
  findFolders(@Request() req: { user: { id: string } }) {
    return this.referenceService.findFolders(req.user.id);
  }

  @Post('folders')
  @ApiOperation({ summary: '创建文件夹' })
  createFolder(@Request() req: { user: { id: string } }, @Body() dto: CreateReferenceFolderDto) {
    return this.referenceService.createFolder(req.user.id, dto);
  }

  @Patch('folders/:id')
  @ApiOperation({ summary: '更新文件夹' })
  updateFolder(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: UpdateReferenceFolderDto,
  ) {
    return this.referenceService.updateFolder(req.user.id, id, dto);
  }

  @Delete('folders/:id')
  @ApiOperation({ summary: '删除文件夹' })
  removeFolder(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.referenceService.removeFolder(req.user.id, id);
  }
}
