import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { NoteService } from './note.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateNoteDto, UpdateNoteDto, SearchNoteDto, CreateNoteFolderDto, UpdateNoteFolderDto } from './dto';

@ApiTags('笔记管理')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('notes')
export class NoteController {
  constructor(private readonly noteService: NoteService) {}

  @Get()
  @ApiOperation({ summary: '获取笔记列表' })
  @ApiQuery({ name: 'folderId', required: false, description: '按文件夹筛选' })
  @ApiQuery({ name: 'tag', required: false, description: '按标签筛选' })
  @ApiQuery({ name: 'archived', required: false, description: '是否包含归档笔记', type: 'boolean' })
  @ApiQuery({ name: 'referenceId', required: false, description: '按关联文献 ID 筛选' })
  @ApiResponse({ status: 200, description: '返回笔记列表' })
  findAll(
    @Request() req: { user: { id: string } },
    @Query('folderId') folderId?: string,
    @Query('tag') tag?: string,
    @Query('archived') archived?: string,
    @Query('referenceId') referenceId?: string,
  ) {
    return this.noteService.findAll(req.user.id, {
      folderId,
      tag,
      archived: archived === 'true',
      referenceId,
    });
  }

  @Get('search')
  @ApiOperation({ summary: '搜索笔记（全文匹配）' })
  @ApiResponse({ status: 200, description: '返回搜索结果' })
  search(@Request() req: { user: { id: string } }, @Query() dto: SearchNoteDto) {
    return this.noteService.search(req.user.id, dto);
  }

  @Post('search/semantic')
  @ApiOperation({ summary: '语义搜索笔记（基于 Embedding 向量相似度）' })
  @ApiResponse({ status: 200, description: '返回语义相似度排序结果' })
  semanticSearch(
    @Request() req: { user: { id: string } },
    @Body() body: { query: string; limit?: number },
  ) {
    return this.noteService.semanticSearch(
      req.user.id,
      body.query,
      body.limit ?? 10,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: '获取笔记详情' })
  @ApiResponse({ status: 200, description: '返回笔记详情' })
  @ApiResponse({ status: 404, description: '笔记不存在' })
  findOne(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.noteService.findOne(req.user.id, id);
  }

  @Post()
  @ApiOperation({ summary: '创建笔记' })
  @ApiResponse({ status: 201, description: '笔记创建成功' })
  @ApiResponse({ status: 400, description: '请求参数校验失败' })
  create(@Request() req: { user: { id: string } }, @Body() dto: CreateNoteDto) {
    return this.noteService.create(req.user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新笔记' })
  @ApiResponse({ status: 200, description: '笔记更新成功' })
  @ApiResponse({ status: 404, description: '笔记不存在' })
  update(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: UpdateNoteDto,
  ) {
    return this.noteService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '软删除笔记' })
  @ApiResponse({ status: 200, description: '笔记删除成功' })
  @ApiResponse({ status: 404, description: '笔记不存在' })
  remove(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.noteService.remove(req.user.id, id);
  }

  // ===== 文件夹 =====

  @Get('folders/tree')
  @ApiOperation({ summary: '获取文件夹树' })
  @ApiResponse({ status: 200, description: '返回文件夹列表' })
  findFolders(@Request() req: { user: { id: string } }) {
    return this.noteService.findFolders(req.user.id);
  }

  @Post('folders')
  @ApiOperation({ summary: '创建文件夹' })
  @ApiResponse({ status: 201, description: '文件夹创建成功' })
  createFolder(@Request() req: { user: { id: string } }, @Body() dto: CreateNoteFolderDto) {
    return this.noteService.createFolder(req.user.id, dto);
  }

  @Patch('folders/:id')
  @ApiOperation({ summary: '更新文件夹' })
  @ApiResponse({ status: 200, description: '文件夹更新成功' })
  @ApiResponse({ status: 404, description: '文件夹不存在' })
  updateFolder(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: UpdateNoteFolderDto,
  ) {
    return this.noteService.updateFolder(req.user.id, id, dto);
  }

  @Delete('folders/:id')
  @ApiOperation({ summary: '删除文件夹（仅空文件夹）' })
  @ApiResponse({ status: 200, description: '文件夹删除成功' })
  @ApiResponse({ status: 404, description: '文件夹不存在' })
  removeFolder(@Request() req: { user: { id: string } }, @Param('id') id: string) {
    return this.noteService.removeFolder(req.user.id, id);
  }
}
