import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsIn, Min, Max } from 'class-validator';
import { TaskStatus } from '@research/shared-types';

export class UpdateTaskDto {
  @ApiPropertyOptional({ description: '任务标题' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: '任务状态', enum: TaskStatus })
  @IsOptional()
  @IsIn(Object.values(TaskStatus))
  status?: TaskStatus;

  @ApiPropertyOptional({ description: '优先级 1-4（P1-P4）', minimum: 1, maximum: 4 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4)
  priority?: number;

  @ApiPropertyOptional({ description: '父任务 ID' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ description: '预计番茄数' })
  @IsOptional()
  @IsNumber()
  pomodoroCount?: number;

  @ApiPropertyOptional({ description: '关联文献 ID' })
  @IsOptional()
  @IsString()
  referenceId?: string;
}
