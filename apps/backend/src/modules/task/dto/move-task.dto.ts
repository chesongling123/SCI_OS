import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsIn } from 'class-validator';
import { TaskStatus } from '@research/shared-types';

export class MoveTaskDto {
  @ApiProperty({ description: '目标状态', enum: TaskStatus })
  @IsIn(Object.values(TaskStatus))
  status: TaskStatus;

  @ApiProperty({ description: '目标排序位置' })
  @IsNumber()
  sortOrder: number;
}
