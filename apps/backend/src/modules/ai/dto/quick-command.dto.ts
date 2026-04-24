import { IsString, IsOptional, IsIn, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QuickCommandDto {
  @ApiProperty({ description: '快捷命令', enum: ['translate', 'polish', 'summarize'] })
  @IsString()
  @IsIn(['translate', 'polish', 'summarize'])
  command: 'translate' | 'polish' | 'summarize';

  @ApiProperty({ description: '待处理的文本' })
  @IsString()
  text: string;

  @ApiPropertyOptional({ description: '翻译目标语言（默认中文）' })
  @IsOptional()
  @IsString()
  targetLang?: string;

  @ApiPropertyOptional({ description: '摘要最大字数（默认 200）' })
  @IsOptional()
  @IsInt()
  @Min(10)
  maxLength?: number;
}
