import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignJWT, importPKCS8 } from 'jose';
import { RedisService } from '../../shared/redis.service';
import { WeatherCurrentDto, CityLookupResult } from './dto/weather.dto';

/**
 * 和风天气 API 服务
 *
 * 支持两种认证方式（优先使用 API Key）：
 * 1. API Key（免费版标准方式，推荐）
 *    - 在 apps/backend/.env 中配置：QWEATHER_API_KEY=你的APIKey
 * 2. JWT（EdDSA/Ed25519，企业/高级订阅）
 *    - 在 apps/backend/.env 中配置：
 *      QWEATHER_API_HOST=你的项目专属域名（如 https://xxx.qweatherapi.com）
 *      QWEATHER_KID=凭据ID
 *      QWEATHER_PRIVATE_KEY=Ed25519私钥（PEM格式）
 *      QWEATHER_PROJECT_ID=项目ID
 *
 * 如果未配置任何认证或 API 调用失败，会返回模拟数据（避免影响主流程）。
 */
@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private hasWarnedMissingConfig = false;

  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  /**
   * 获取指定城市的实时天气
   * 优先查缓存 → 调 API → 失败时返回模拟数据
   */
  async getCurrentWeather(city: string): Promise<WeatherCurrentDto> {
    try {
      return await this.fetchRealWeather(city);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!this.hasWarnedMissingConfig) {
        this.logger.warn(
          `[和风天气] 获取真实天气失败: ${message}。` +
          `当前返回模拟数据。`,
        );
        this.hasWarnedMissingConfig = true;
      }
      return this.getMockWeather(city);
    }
  }

  /**
   * 调真实和风天气 API
   */
  private async fetchRealWeather(city: string): Promise<WeatherCurrentDto> {
    const auth = await this.getAuthConfig();

    // 1. 查询城市 ID（优先缓存）
    const cityCacheKey = `weather:city:${city}`;
    let cityInfo: CityLookupResult | null = null;

    const cachedCity = await this.redis.get(cityCacheKey);
    if (cachedCity) {
      try {
        cityInfo = JSON.parse(cachedCity);
      } catch {
        // 缓存损坏，重新查询
      }
    }

    if (!cityInfo) {
      cityInfo = await this.lookupCity(city, auth);
      await this.redis.set(cityCacheKey, JSON.stringify(cityInfo), 86400); // 缓存 24 小时
    }

    // 2. 查询实时天气（优先缓存）
    const weatherCacheKey = `weather:now:${cityInfo.locationId}`;
    const cachedWeather = await this.redis.get(weatherCacheKey);

    if (cachedWeather) {
      try {
        const data = JSON.parse(cachedWeather) as WeatherCurrentDto;
        data.fromCache = true;
        return data;
      } catch {
        // 缓存损坏，重新查询
      }
    }

    // 3. 调用和风天气 API
    const weather = await this.fetchCurrentWeather(cityInfo, auth);
    await this.redis.set(weatherCacheKey, JSON.stringify(weather), 10800); // 缓存 3 小时

    return weather;
  }

  /**
   * 模拟天气数据（API 未配置或失败时使用）
   */
  private getMockWeather(city: string): WeatherCurrentDto {
    return {
      city,
      locationId: '000000000',
      temp: 22,
      feelsLike: 21,
      icon: '101',
      text: '多云',
      windDir: '东南风',
      windScale: '2',
      humidity: 45,
      updateTime: new Date().toISOString(),
      fromCache: false,
    };
  }

  /**
   * 认证配置
   */
  private async getAuthConfig(): Promise<
    | { type: 'apikey'; key: string }
    | { type: 'jwt'; token: string }
  > {
    const apiKey = this.config.get<string>('QWEATHER_API_KEY');
    if (apiKey) {
      return { type: 'apikey', key: apiKey };
    }

    const token = await this.getJwtToken();
    return { type: 'jwt', token };
  }

  /**
   * 获取和风天气 JWT Token（带缓存）
   *
   * Token 生成后写入 Redis，9 分钟内复用（Token 本身有效期 10 分钟，留 1 分钟缓冲）。
   * 避免每次请求都做 Ed25519 签名运算（CPU 密集型）。
   */
  private async getJwtToken(): Promise<string> {
    const cacheKey = 'weather:jwt:token';
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return cached;
    }

    const token = await this.generateJwt();
    await this.redis.set(cacheKey, token, 540); // 缓存 9 分钟
    return token;
  }

  /**
   * 动态生成和风天气 JWT Token
   * 使用 Ed25519 私钥签名，有效期 10 分钟
   */
  private async generateJwt(): Promise<string> {
    const kid = this.config.get<string>('QWEATHER_KID');
    const privateKeyPem = this.config.get<string>('QWEATHER_PRIVATE_KEY');
    const projectId = this.config.get<string>('QWEATHER_PROJECT_ID');

    if (!kid || !privateKeyPem || !projectId) {
      throw new Error(
        '和风天气配置不完整。请在 apps/backend/.env 中配置以下任一方式：\n' +
        '\n方式一（免费版推荐）：\n' +
        'QWEATHER_API_KEY=你的APIKey\n' +
        '\n方式二（JWT认证）：\n' +
        'QWEATHER_API_HOST=https://xxx.qweatherapi.com\n' +
        'QWEATHER_KID=你的凭据ID\n' +
        'QWEATHER_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n你的Ed25519私钥\n-----END PRIVATE KEY-----\n' +
        'QWEATHER_PROJECT_ID=你的项目ID',
      );
    }

    try {
      // 将 PEM 格式私钥导入为 CryptoKey
      const privateKey = await importPKCS8(privateKeyPem.trim(), 'EdDSA');

      // 生成 JWT
      const jwt = await new SignJWT({ sub: projectId })
        .setProtectedHeader({ alg: 'EdDSA', kid })
        .setIssuedAt()
        .setExpirationTime('10m')
        .sign(privateKey);

      return jwt;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`JWT 生成失败: ${message}。请检查 QWEATHER_PRIVATE_KEY 是否为有效的 Ed25519 PEM 格式私钥。`);
    }
  }

  /**
   * 调用和风天气 GeoAPI：城市名 → locationId
   *
   * - API Key 免费版：geoapi.qweather.com/v2/city/lookup
   * - JWT 企业版：自定义域名/geo/v2/city/lookup
   */
  private async lookupCity(
    city: string,
    auth: Awaited<ReturnType<typeof this.getAuthConfig>>,
  ): Promise<CityLookupResult> {
    const { host, cityPath } = this.getApiEndpoints(auth.type);
    const baseUrl = `${host}${cityPath}`;
    const params = new URLSearchParams({ location: city, number: '1' });

    const { url, headers } = this.buildRequest(baseUrl, params, auth);
    this.logger.debug(`[和风天气] 城市查询: ${url}`);

    const res = await fetch(url, { headers });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.warn(`[和风天气] 城市查询失败: ${res.status}, body=${body.slice(0, 200)}`);
      throw new Error(`和风天气城市查询失败: ${res.status}`);
    }

    const data = await res.json();
    if (data.code !== '200' || !data.location?.length) {
      throw new Error(`未找到城市「${city}」，请检查城市名称`);
    }

    const loc = data.location[0];
    return {
      locationId: loc.id,
      name: loc.name,
      adm1: loc.adm1,
      country: loc.country,
    };
  }

  /**
   * 调用和风天气实时天气 API
   *
   * - API Key 免费版：devapi.qweather.com/v7/weather/now
   * - JWT 企业版：自定义域名/v7/weather/now
   */
  private async fetchCurrentWeather(
    cityInfo: CityLookupResult,
    auth: Awaited<ReturnType<typeof this.getAuthConfig>>,
  ): Promise<WeatherCurrentDto> {
    const { host, weatherPath } = this.getApiEndpoints(auth.type);
    const baseUrl = `${host}${weatherPath}`;
    const params = new URLSearchParams({ location: cityInfo.locationId });

    const { url, headers } = this.buildRequest(baseUrl, params, auth);
    this.logger.debug(`[和风天气] 天气查询: ${url}`);

    const res = await fetch(url, { headers });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.warn(`[和风天气] API 请求失败: ${res.status}, body=${body.slice(0, 200)}`);
      throw new Error(`和风天气 API 请求失败: ${res.status}`);
    }

    const data = await res.json();
    if (data.code !== '200') {
      throw new Error(`和风天气 API 错误: ${data.code}`);
    }

    const now = data.now;
    return {
      city: cityInfo.name,
      locationId: cityInfo.locationId,
      temp: parseInt(now.temp, 10),
      feelsLike: parseInt(now.feelsLike, 10),
      icon: now.icon,
      text: now.text,
      windDir: now.windDir,
      windScale: now.windScale,
      humidity: parseInt(now.humidity, 10),
      updateTime: data.updateTime || new Date().toISOString(),
    };
  }

  /**
   * 根据认证方式返回对应的 API 端点
   *
   * - API Key：使用官方公共域名
   * - JWT：必须使用项目专属自定义域名（如 xxx.qweatherapi.com）
   */
  private getApiEndpoints(authType: 'apikey' | 'jwt'): {
    host: string;
    cityPath: string;
    weatherPath: string;
  } {
    if (authType === 'apikey') {
      return {
        host: 'https://geoapi.qweather.com',
        cityPath: '/v2/city/lookup',
        weatherPath: '/v7/weather/now',
      };
    }

    const host = this.config.get<string>('QWEATHER_API_HOST');
    if (!host) {
      throw new Error(
        'JWT 认证必须配置 QWEATHER_API_HOST（项目专属域名，如 https://xxx.qweatherapi.com）。' +
        '请在和风天气开发者控制台查看你的 API Host。',
      );
    }

    // JWT 认证使用统一域名，路径略有不同（geo 使用 /geo/v2）
    const normalizedHost = host
      .trim()
      .replace(/\/$/, '') // 去掉末尾斜杠
      .replace(/^https?:\/\//, ''); // 先去掉可能存在的协议

    return {
      host: `https://${normalizedHost}`,
      cityPath: '/geo/v2/city/lookup',
      weatherPath: '/v7/weather/now',
    };
  }

  /**
   * 根据认证方式构建请求 URL 和 Headers
   */
  private buildRequest(
    baseUrl: string,
    params: URLSearchParams,
    auth: Awaited<ReturnType<typeof this.getAuthConfig>>,
  ): { url: string; headers: Record<string, string> } {
    if (auth.type === 'apikey') {
      params.set('key', auth.key);
      return { url: `${baseUrl}?${params.toString()}`, headers: {} };
    }

    // JWT 认证
    return {
      url: `${baseUrl}?${params.toString()}`,
      headers: { Authorization: `Bearer ${auth.token}` },
    };
  }
}
