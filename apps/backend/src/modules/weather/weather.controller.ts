import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WeatherService } from './weather.service';
import { WeatherCurrentDto } from './dto/weather.dto';

@ApiTags('天气')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get('current')
  @ApiOperation({ summary: '获取指定城市实时天气' })
  @ApiQuery({ name: 'city', required: true, description: '城市名称，如「北京」「上海」' })
  @ApiResponse({ status: 200, description: '返回实时天气', type: WeatherCurrentDto })
  @ApiResponse({ status: 400, description: '城市名称缺失或无效' })
  @ApiResponse({ status: 503, description: '和风天气服务未配置或不可用' })
  async getCurrentWeather(
    @Query('city') city: string,
  ): Promise<WeatherCurrentDto> {
    if (!city || city.trim().length === 0) {
      throw new Error('城市名称不能为空');
    }
    return this.weatherService.getCurrentWeather(city.trim());
  }
}
