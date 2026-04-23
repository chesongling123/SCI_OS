import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsBoolean, IsObject } from 'class-validator';

export class UpdateNoteDto {
  @ApiPropertyOptional({ description: '笔记标题' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: '笔记内容（Tiptap JSON 格式）', type: Object })
  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;

  @ApiPropertyOptional({ description: '纯文本内容，用于搜索' })
  @IsOptional()
  @IsString()
  plainText?: string;

  @ApiPropertyOptional({ description: '标签列表', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: '所属文件夹 ID，传 null 表示移出文件夹' })
  @IsOptional()
  @IsString()
  folderId?: string | null;

  @ApiPropertyOptional({ description: '是否置顶' })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional({ description: '是否归档' })
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;

  @ApiPropertyOptional({ description: '关联文献 ID' })
  @IsOptional()
  @IsString()
  referenceId?: string;
}
