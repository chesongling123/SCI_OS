import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchNoteDto {
  @ApiProperty({ description: '搜索关键词' })
  @IsString()
  q: string;

  @ApiPropertyOptional({ description: '按标签过滤' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ description: '返回数量上限', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
