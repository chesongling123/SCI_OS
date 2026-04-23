import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateSessionDto {
  @ApiPropertyOptional({ description: '关联任务 ID' })
  @IsOptional()
  @IsString()
  taskId?: string;

  @ApiPropertyOptional({ description: '关联文献 ID' })
  @IsOptional()
  @IsString()
  referenceId?: string;

  @ApiPropertyOptional({ description: '计划专注时长（秒），默认 1500 = 25 分钟', default: 1500 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  plannedDuration?: number;
}
