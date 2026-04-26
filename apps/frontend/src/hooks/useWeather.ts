import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authHeaders } from '../lib/api';

export interface WeatherCurrent {
  city: string;
  locationId: string;
  temp: number;
  feelsLike: number;
  icon: string;
  text: string;
  windDir: string;
  windScale: string;
  humidity: number;
  updateTime: string;
  fromCache?: boolean;
}

const API_BASE = '/api/v1/weather';

/**
 * 获取指定城市实时天气
 */
export function useWeather(city: string, enabled = true) {
  return useQuery<WeatherCurrent>({
    queryKey: ['weather', city],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/current?city=${encodeURIComponent(city)}`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`获取天气失败 (${res.status}): ${body.slice(0, 100)}`);
      }
      return res.json();
    },
    enabled: enabled && city.trim().length > 0,
    staleTime: 1000 * 60 * 60 * 3, // 3 小时内不重复请求
    retry: 1,
  });
}

/**
 * 强制刷新天气（清除缓存后重新获取）
 */
export function useRefreshWeather() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (city) => {
      queryClient.invalidateQueries({ queryKey: ['weather', city] });
    },
  });
}
