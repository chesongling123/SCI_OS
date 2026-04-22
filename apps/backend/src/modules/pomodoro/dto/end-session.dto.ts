import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, Min, IsOptional } from 'class-validator';

export class EndSessionDto {
  @ApiProperty({ description: '实际专注秒数' })
  @IsNumber()
  @Min(0)
  duration: number;

  @ApiPropertyOptional({ description: '中断次数', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  interruptions?: number;
}
