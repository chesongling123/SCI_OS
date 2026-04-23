import { IsString, IsOptional, IsInt, IsArray, IsNumber, IsEnum } from 'class-validator';
import { ReadingStatus, LiteratureType } from '@phd/shared-types';

/**
 * 创建文献 DTO
 */
export class CreateReferenceDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  authors?: string[];

  @IsOptional()
  @IsInt()
  year?: number;

  @IsOptional()
  @IsString()
  journal?: string;

  @IsOptional()
  @IsString()
  volume?: string;

  @IsOptional()
  @IsString()
  issue?: string;

  @IsOptional()
  @IsString()
  pages?: string;

  @IsOptional()
  @IsString()
  doi?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  abstract?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsString()
  literatureType?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  folderId?: string;

  @IsOptional()
  @IsInt()
  priority?: number;
}

/**
 * 更新文献 DTO
 */
export class UpdateReferenceDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  authors?: string[];

  @IsOptional()
  @IsInt()
  year?: number;

  @IsOptional()
  @IsString()
  journal?: string;

  @IsOptional()
  @IsString()
  volume?: string;

  @IsOptional()
  @IsString()
  issue?: string;

  @IsOptional()
  @IsString()
  pages?: string;

  @IsOptional()
  @IsString()
  doi?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  abstract?: string;

  @IsOptional()
  @IsString()
  abstractZh?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsString()
  literatureType?: string;

  @IsOptional()
  @IsString()
  readingStatus?: string;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsInt()
  rating?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  folderId?: string | null;
}

/**
 * 更新阅读状态 DTO
 */
export class UpdateReadingStatusDto {
  @IsString()
  readingStatus: string;
}

/**
 * 查询文献列表参数
 */
export class ReferenceQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsString()
  folderId?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @IsInt()
  limit?: number;
}

/**
 * 创建文献文件夹 DTO
 */
export class CreateReferenceFolderDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}

/**
 * 更新文献文件夹 DTO
 */
export class UpdateReferenceFolderDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}
