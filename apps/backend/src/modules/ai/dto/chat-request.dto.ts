import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatRequestDto {
  @ApiProperty({ description: '用户消息' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: '对话历史（可选，用于多轮对话）' })
  @IsOptional()
  @IsArray()
  history?: { role: 'user' | 'assistant'; content: string }[];
}
