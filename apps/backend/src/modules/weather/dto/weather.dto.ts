import { ApiProperty } from '@nestjs/swagger';

/**
 * 实时天气响应 DTO
 * 精简前端需要的关键字段
 */
export class WeatherCurrentDto {
  @ApiProperty({ description: '城市名称' })
  city: string;

  @ApiProperty({ description: '和风天气 location ID' })
  locationId: string;

  @ApiProperty({ description: '当前温度（摄氏度）' })
  temp: number;

  @ApiProperty({ description: '体感温度（摄氏度）' })
  feelsLike: number;

  @ApiProperty({ description: '天气状况图标代码' })
  icon: string;

  @ApiProperty({ description: '天气状况文字描述' })
  text: string;

  @ApiProperty({ description: '风向' })
  windDir: string;

  @ApiProperty({ description: '风力等级' })
  windScale: string;

  @ApiProperty({ description: '相对湿度（%）' })
  humidity: number;

  @ApiProperty({ description: '更新时间（ISO 8601）' })
  updateTime: string;

  @ApiProperty({ description: '数据来源是否来自缓存', required: false })
  fromCache?: boolean;
}

/**
 * 城市查询响应（内部使用，精简字段）
 */
export interface CityLookupResult {
  locationId: string;
  name: string;
  adm1: string; // 省级行政区
  country: string;
}
