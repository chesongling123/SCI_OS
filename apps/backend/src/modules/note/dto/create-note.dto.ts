import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsBoolean, IsObject } from 'class-validator';

export class CreateNoteDto {
  @ApiProperty({ description: '笔记标题' })
  @IsString()
  title: string;

  @ApiProperty({ description: '笔记内容（Tiptap JSON 格式）', type: Object })
  @IsObject()
  content: Record<string, unknown>;

  @ApiProperty({ description: '纯文本内容，用于搜索' })
  @IsString()
  plainText: string;

  @ApiPropertyOptional({ description: '标签列表', type: [String], default: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: '所属文件夹 ID' })
  @IsOptional()
  @IsString()
  folderId?: string;

  @ApiPropertyOptional({ description: '关联文献 ID' })
  @IsOptional()
  @IsString()
  referenceId?: string;
}
