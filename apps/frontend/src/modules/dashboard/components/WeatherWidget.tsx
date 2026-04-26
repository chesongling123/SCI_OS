import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Sun,
  Moon,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  Wind,
  MapPin,
  RefreshCw,
  Settings,
  Check,
  Loader2,
} from 'lucide-react';
import { useWeather, useRefreshWeather, WeatherCurrent } from '../../../hooks/useWeather';

const CITY_STORAGE_KEY = 'phd-weather-city';
const WEATHER_CACHE_KEY = 'phd-weather-cache';
const DEFAULT_CITY = '北京';
const CACHE_TTL_MS = 1000 * 60 * 60 * 3; // 本地缓存 3 小时

/**
 * 本地缓存的天气数据结构
 */
interface CachedWeather {
  city: string;
  data: WeatherCurrent;
  cachedAt: number;
}

/**
 * 和风天气 icon → Lucide 图标 + 颜色映射
 */
function getWeatherMeta(iconCode: string): {
  Icon: React.ElementType;
  iconColor: string;
  bgGradient: string;
} {
  const code = parseInt(iconCode, 10);

  // 晴（含夜间）
  if ([100, 150, 800, 900].includes(code)) {
    return {
      Icon: code === 150 ? Moon : Sun,
      iconColor: 'oklch(0.7 0.12 75)',
      bgGradient: 'linear-gradient(135deg, oklch(0.75 0.06 75 / 0.15), oklch(0.65 0.04 55 / 0.1))',
    };
  }

  // 多云 / 少云 / 晴间多云
  if ([101, 102, 103, 151, 152, 153].includes(code)) {
    return {
      Icon: Cloud,
      iconColor: 'oklch(0.65 0.03 260)',
      bgGradient: 'linear-gradient(135deg, oklch(0.7 0.02 260 / 0.12), oklch(0.6 0.01 250 / 0.08))',
    };
  }

  // 阴
  if (code === 104) {
    return {
      Icon: Cloud,
      iconColor: 'oklch(0.55 0.02 260)',
      bgGradient: 'linear-gradient(135deg, oklch(0.6 0.015 260 / 0.1), oklch(0.5 0.01 250 / 0.06))',
    };
  }

  // 雷阵雨 / 雷阵雨伴有冰雹
  if ([302, 303, 304].includes(code)) {
    return {
      Icon: CloudLightning,
      iconColor: 'oklch(0.6 0.1 290)',
      bgGradient: 'linear-gradient(135deg, oklch(0.55 0.05 290 / 0.15), oklch(0.45 0.03 260 / 0.1))',
    };
  }

  // 雨（各种雨）
  if ((code >= 300 && code <= 399) || (code >= 310 && code <= 399)) {
    return {
      Icon: CloudRain,
      iconColor: 'oklch(0.55 0.08 250)',
      bgGradient: 'linear-gradient(135deg, oklch(0.6 0.04 250 / 0.12), oklch(0.5 0.02 260 / 0.08))',
    };
  }

  // 雪（各种雪）
  if (code >= 400 && code <= 499) {
    return {
      Icon: CloudSnow,
      iconColor: 'oklch(0.7 0.04 260)',
      bgGradient: 'linear-gradient(135deg, oklch(0.75 0.02 260 / 0.1), oklch(0.65 0.01 250 / 0.06))',
    };
  }

  // 雾 / 霾
  if (code >= 500 && code <= 515) {
    return {
      Icon: CloudFog,
      iconColor: 'oklch(0.55 0.02 60)',
      bgGradient: 'linear-gradient(135deg, oklch(0.6 0.015 60 / 0.1), oklch(0.5 0.01 55 / 0.06))',
    };
  }

  // 沙尘
  if (code >= 503 && code <= 508) {
    return {
      Icon: Wind,
      iconColor: 'oklch(0.65 0.08 75)',
      bgGradient: 'linear-gradient(135deg, oklch(0.7 0.04 75 / 0.12), oklch(0.6 0.03 65 / 0.08))',
    };
  }

  // 默认
  return {
    Icon: Sun,
    iconColor: 'oklch(0.65 0.08 75)',
    bgGradient: 'linear-gradient(135deg, oklch(0.7 0.03 75 / 0.1), transparent)',
  };
}

export function WeatherWidget() {
  const [city, setCity] = useState<string>(() => {
    return localStorage.getItem(CITY_STORAGE_KEY) || DEFAULT_CITY;
  });
  const [inputCity, setInputCity] = useState(city);
  const [isEditing, setIsEditing] = useState(false);
  const [shouldFetch, setShouldFetch] = useState(false);
  const [localWeather, setLocalWeather] = useState<WeatherCurrent | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: weather, isLoading, error } = useWeather(city, shouldFetch);
  const refreshWeather = useRefreshWeather();

  // 组件挂载时：优先读本地缓存展示，同时触发后台静默更新
  useEffect(() => {
    const cached = localStorage.getItem(WEATHER_CACHE_KEY);
    if (cached) {
      try {
        const parsed: CachedWeather = JSON.parse(cached);
        if (parsed.city === city && Date.now() - parsed.cachedAt < CACHE_TTL_MS) {
          setLocalWeather(parsed.data);
        }
      } catch {
        // 缓存损坏，忽略
      }
    }
    // 无论有没有缓存，都触发一次后台获取（React Query 会根据 staleTime 决定是否真发请求）
    setShouldFetch(true);
  }, [city]);

  // 拿到新数据后更新本地缓存
  useEffect(() => {
    if (weather) {
      setLocalWeather(weather);
      const cache: CachedWeather = { city, data: weather, cachedAt: Date.now() };
      localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(cache));
    }
  }, [weather, city]);

  // 聚焦输入框
  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleSaveCity = useCallback(() => {
    const trimmed = inputCity.trim();
    if (trimmed && trimmed !== city) {
      localStorage.setItem(CITY_STORAGE_KEY, trimmed);
      localStorage.removeItem(WEATHER_CACHE_KEY); // 切换城市时清除旧缓存
      setCity(trimmed);
      setLocalWeather(null);
      setShouldFetch(true);
    }
    setIsEditing(false);
  }, [inputCity, city]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSaveCity();
      if (e.key === 'Escape') {
        setInputCity(city);
        setIsEditing(false);
      }
    },
    [handleSaveCity, city]
  );

  const handleRefresh = useCallback(() => {
    localStorage.removeItem(WEATHER_CACHE_KEY); // 强制刷新时清除本地缓存
    setShouldFetch(true);
    refreshWeather.mutate(city);
  }, [city, refreshWeather]);

  return (
    <div
      className="relative p-4 rounded-xl overflow-hidden"
      style={{
        background: weather
          ? `${getWeatherMeta(weather.icon).bgGradient}, var(--glass-bg)`
          : 'var(--glass-bg)',
        backdropFilter: 'blur(16px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(16px) saturate(1.2)',
        border: '1px solid var(--glass-border)',
        borderTopColor: 'var(--glass-border-highlight)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), var(--glass-shadow)',
        transition: 'background 0.5s ease',
      }}
    >
      {/* 顶部栏：城市 + 操作按钮 */}
      <div className="flex items-center justify-between">
        {isEditing ? (
          <div className="flex items-center gap-1.5 flex-1">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
            <input
              ref={inputRef}
              value={inputCity}
              onChange={(e) => setInputCity(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSaveCity}
              className="flex-1 min-w-0 bg-transparent text-sm font-medium outline-none border-b border-dashed"
              style={{ color: 'var(--text-primary)', borderColor: 'var(--glass-border)' }}
              placeholder="输入城市名"
            />
            <button
              onClick={handleSaveCity}
              className="p-1 rounded-md transition-colors hover:bg-white/10"
              style={{ color: 'var(--text-muted)' }}
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 group"
          >
            <MapPin className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {city}
            </span>
            <Settings className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-muted)' }} />
          </button>
        )}

        <div className="flex items-center gap-0.5">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-1.5 rounded-md transition-all hover:bg-white/10 disabled:opacity-50"
            style={{ color: 'var(--text-muted)' }}
            title="刷新天气"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 天气主体 */}
      {error ? (
        <div className="flex flex-col items-center py-4 text-center">
          <Cloud className="w-8 h-8 mb-2" style={{ color: 'var(--text-muted)' }} />
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {error.message.includes('未配置')
              ? '天气服务未配置'
              : error.message.includes('未找到')
                ? `未找到城市「${city}」`
                : '天气数据获取失败'}
          </p>
          {error.message.includes('未配置') && (
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
              请配置 QWEATHER_API_KEY
            </p>
          )}
        </div>
      ) : isLoading && !localWeather ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-muted)' }} />
        </div>
      ) : localWeather ? (
        <div className="flex items-center justify-between py-3">
          {/* 左侧：大图标 */}
          <div className="flex items-center justify-center w-16 h-16">
            <WeatherIcon icon={localWeather.icon} />
          </div>

          {/* 右侧：温度 + 信息 */}
          <div className="flex-1 text-right">
            <div className="flex items-baseline justify-end gap-1">
              <span
                className="text-4xl font-bold tracking-tighter"
                style={{ color: 'var(--text-primary)' }}
              >
                {localWeather.temp}
              </span>
              <span className="text-xl font-light" style={{ color: 'var(--text-muted)' }}>
                °C
              </span>
            </div>
            <div className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {localWeather.text}
            </div>
            <div
              className="flex items-center justify-end gap-2 mt-1.5 text-[10px]"
              style={{ color: 'var(--text-muted)' }}
            >
              <span>体感 {localWeather.feelsLike}°</span>
              <span className="w-px h-2.5" style={{ background: 'var(--glass-border)' }} />
              <span>{localWeather.windDir} {localWeather.windScale}级</span>
              <span className="w-px h-2.5" style={{ background: 'var(--glass-border)' }} />
              <span>湿度 {localWeather.humidity}%</span>
            </div>
            {isLoading && (
              <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
                更新中…
              </div>
            )}
            {!isLoading && localWeather.fromCache && (
              <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
                来自缓存
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * 天气图标组件
 * 根据和风天气 icon 代码渲染对应的 Lucide 图标
 */
function WeatherIcon({ icon, size = 48 }: { icon: string; size?: number }) {
  const { Icon, iconColor } = getWeatherMeta(icon);
  return (
    <Icon
      className="transition-all duration-500"
      style={{
        width: size,
        height: size,
        color: iconColor,
        filter: `drop-shadow(0 2px 8px ${iconColor}30)`,
      }}
    />
  );
}
