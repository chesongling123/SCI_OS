import { Module } from '@nestjs/common';
import { WeatherController } from './weather.controller';
import { WeatherService } from './weather.service';
import { RedisService } from '../../shared/redis.service';

@Module({
  controllers: [WeatherController],
  providers: [WeatherService, RedisService],
})
export class WeatherModule {}
