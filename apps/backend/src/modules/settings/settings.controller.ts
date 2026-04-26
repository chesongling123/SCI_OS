import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateSettingsDto } from './dto';

@ApiTags('设置')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: '获取当前用户设置' })
  @ApiResponse({ status: 200, description: '返回用户设置' })
  getSettings(@Request() req: { user: { id: string } }) {
    return this.settingsService.findOrCreate(req.user.id);
  }

  @Patch()
  @ApiOperation({ summary: '更新用户设置' })
  @ApiResponse({ status: 200, description: '设置更新成功' })
  updateSettings(
    @Request() req: { user: { id: string } },
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.settingsService.update(req.user.id, dto);
  }
}
