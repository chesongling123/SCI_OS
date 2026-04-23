import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateNoteFolderDto {
  @ApiPropertyOptional({ description: '文件夹名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '父文件夹 ID，传 null 表示移为顶层' })
  @IsOptional()
  @IsString()
  parentId?: string | null;
}
