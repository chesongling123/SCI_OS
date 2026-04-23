import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateNoteFolderDto {
  @ApiProperty({ description: '文件夹名称' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '父文件夹 ID' })
  @IsOptional()
  @IsString()
  parentId?: string;
}
