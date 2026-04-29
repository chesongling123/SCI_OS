import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Timer,
  Sunrise,
  Check,
  X,
  Zap,
  AlertTriangle,
  Coffee,
  BookOpen,
  TrendingUp,
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
  Loader2,
  Sparkles,
  Clock,
} from 'lucide-react';
import { useAuthStore } from '../../../stores/auth';
import { useProactiveStore, ProactiveSuggestion } from '../../../stores/proactive';
import { useWeather, useRefreshWeather, WeatherCurrent } from '../../../hooks/useWeather';

/* ─────────────── 欢迎横幅工具函数 ─────────────── */

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了';
  if (hour < 12) return '早安';
  if (hour < 14) return '午安';
  if (hour < 18) return '下午好';
  return '晚上好';
}

function formatFullDate(date: Date): string {
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}年${month}月${day}日 ${weekdays[date.getDay()]}`;
}

/* ─────────────── 实时时钟组件 ─────────────── */

function LiveClock({ theme }: { theme: ReturnType<typeof getWeatherTheme> }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const seconds = time.getSeconds().toString().padStart(2, '0');

  return (
    <div className="flex items-center gap-1.5 tabular-nums">
      <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: theme.accentColor, opacity: 0.7 }} />
      <span className="text-sm font-semibold tracking-tight" style={{ color: theme.textColor }}>
        {hours}
      </span>
      <span className="text-sm animate-clock-tick" style={{ color: theme.textMuted }}>
        :
      </span>
      <span className="text-sm font-semibold tracking-tight" style={{ color: theme.textColor }}>
        {minutes}
      </span>
      <span className="text-sm animate-clock-tick" style={{ color: theme.textMuted }}>
        :
      </span>
      <span className="text-sm font-semibold tracking-tight w-[18px]" style={{ color: theme.accentColor }}>
        {seconds}
      </span>
    </div>
  );
}

/* ─────────────── 天气工具函数 ─────────────── */

const CITY_STORAGE_KEY = 'research-weather-city';
const WEATHER_CACHE_KEY = 'research-weather-cache';
const DEFAULT_CITY = '北京';
const CACHE_TTL_MS = 1000 * 60 * 60 * 3;

interface CachedWeather {
  city: string;
  data: WeatherCurrent;
  cachedAt: number;
}

/**
 * 天气主题配置 —— 使用 oklch 色彩空间，确保通透感和一致性
 */
function getWeatherTheme(iconCode: string): {
  bgGradient: string;
  bgGradientRadial: string;
  glow1: string;
  glow2: string;
  iconColor: string;
  Icon: React.ElementType;
  textColor: string;
  textMuted: string;
  accentColor: string;
  cardBg: string;
  particleColor: string;
  mood: string;
  isDark: boolean;
} {
  const code = parseInt(iconCode, 10);

  // 晴（白天）— 暖金色
  if ([100, 800, 900].includes(code)) {
    return {
      bgGradient: 'linear-gradient(160deg, oklch(0.88 0.07 85) 0%, oklch(0.85 0.06 78) 40%, oklch(0.82 0.05 70) 100%)',
      bgGradientRadial: 'radial-gradient(ellipse at 80% 20%, oklch(0.92 0.08 80 / 0.6) 0%, transparent 60%)',
      glow1: 'oklch(0.93 0.1 85 / 0.5)',
      glow2: 'oklch(0.88 0.08 60 / 0.3)',
      iconColor: '#f59e0b',
      Icon: Sun,
      textColor: '#78350f',
      textMuted: 'oklch(0.45 0.04 60)',
      accentColor: '#f59e0b',
      cardBg: 'oklch(1 0 0 / 0.45)',
      particleColor: '#fbbf24',
      mood: '阳光明媚',
      isDark: false,
    };
  }

  // 晴（夜间）— 静谧深蓝
  if ([150].includes(code)) {
    return {
      bgGradient: 'linear-gradient(160deg, oklch(0.32 0.04 260) 0%, oklch(0.36 0.05 255) 40%, oklch(0.4 0.04 250) 100%)',
      bgGradientRadial: 'radial-gradient(ellipse at 70% 30%, oklch(0.5 0.07 260 / 0.35) 0%, transparent 60%)',
      glow1: 'oklch(0.55 0.08 260 / 0.4)',
      glow2: 'oklch(0.5 0.06 240 / 0.25)',
      iconColor: '#a5b4fc',
      Icon: Moon,
      textColor: '#e0e7ff',
      textMuted: 'oklch(0.75 0.02 260)',
      accentColor: '#818cf8',
      cardBg: 'oklch(0.3 0.02 260 / 0.4)',
      particleColor: '#c7d2fe',
      mood: '月色清朗',
      isDark: true,
    };
  }

  // 多云 / 少云 — 柔和天蓝
  if ([101, 102, 103, 151, 152, 153].includes(code)) {
    return {
      bgGradient: 'linear-gradient(160deg, oklch(0.82 0.04 240) 0%, oklch(0.79 0.035 235) 50%, oklch(0.76 0.03 230) 100%)',
      bgGradientRadial: 'radial-gradient(ellipse at 75% 25%, oklch(0.87 0.05 240 / 0.4) 0%, transparent 60%)',
      glow1: 'oklch(0.87 0.06 240 / 0.4)',
      glow2: 'oklch(0.82 0.05 220 / 0.25)',
      iconColor: '#60a5fa',
      Icon: Cloud,
      textColor: '#1e3a5f',
      textMuted: 'oklch(0.45 0.03 240)',
      accentColor: '#3b82f6',
      cardBg: 'oklch(1 0 0 / 0.45)',
      particleColor: '#93c5fd',
      mood: '云淡风轻',
      isDark: false,
    };
  }

  // 阴 — 雅致灰蓝
  if (code === 104) {
    return {
      bgGradient: 'linear-gradient(160deg, oklch(0.75 0.02 240) 0%, oklch(0.72 0.018 235) 50%, oklch(0.7 0.015 230) 100%)',
      bgGradientRadial: 'radial-gradient(ellipse at 70% 30%, oklch(0.8 0.03 240 / 0.3) 0%, transparent 60%)',
      glow1: 'oklch(0.8 0.04 240 / 0.3)',
      glow2: 'oklch(0.77 0.03 220 / 0.2)',
      iconColor: '#94a3b8',
      Icon: Cloud,
      textColor: '#334155',
      textMuted: 'oklch(0.5 0.02 240)',
      accentColor: '#64748b',
      cardBg: 'oklch(1 0 0 / 0.4)',
      particleColor: '#cbd5e1',
      mood: '宁静致远',
      isDark: false,
    };
  }

  // 雷阵雨 — 紫电青霜
  if ([302, 303, 304].includes(code)) {
    return {
      bgGradient: 'linear-gradient(160deg, oklch(0.38 0.07 300) 0%, oklch(0.4 0.06 290) 50%, oklch(0.43 0.05 280) 100%)',
      bgGradientRadial: 'radial-gradient(ellipse at 60% 40%, oklch(0.55 0.09 300 / 0.4) 0%, transparent 60%)',
      glow1: 'oklch(0.58 0.1 300 / 0.45)',
      glow2: 'oklch(0.52 0.07 280 / 0.3)',
      iconColor: '#c4b5fd',
      Icon: CloudLightning,
      textColor: '#ede9fe',
      textMuted: 'oklch(0.8 0.03 290)',
      accentColor: '#8b5cf6',
      cardBg: 'oklch(0.33 0.03 290 / 0.45)',
      particleColor: '#ddd6fe',
      mood: '电闪雷鸣',
      isDark: true,
    };
  }

  // 雨 — 水蓝清幽
  if ((code >= 300 && code <= 399) || (code >= 310 && code <= 399)) {
    return {
      bgGradient: 'linear-gradient(160deg, oklch(0.68 0.06 230) 0%, oklch(0.7 0.05 225) 50%, oklch(0.73 0.045 220) 100%)',
      bgGradientRadial: 'radial-gradient(ellipse at 70% 30%, oklch(0.78 0.07 230 / 0.35) 0%, transparent 60%)',
      glow1: 'oklch(0.78 0.08 230 / 0.35)',
      glow2: 'oklch(0.74 0.06 215 / 0.25)',
      iconColor: '#7dd3fc',
      Icon: CloudRain,
      textColor: '#0c4a6e',
      textMuted: 'oklch(0.45 0.03 230)',
      accentColor: '#0ea5e9',
      cardBg: 'oklch(1 0 0 / 0.45)',
      particleColor: '#bae6fd',
      mood: '细雨绵绵',
      isDark: false,
    };
  }

  // 雪 — 冰晶素雅
  if (code >= 400 && code <= 499) {
    return {
      bgGradient: 'linear-gradient(160deg, oklch(0.9 0.02 240) 0%, oklch(0.87 0.018 235) 50%, oklch(0.85 0.015 230) 100%)',
      bgGradientRadial: 'radial-gradient(ellipse at 80% 20%, oklch(0.94 0.03 240 / 0.4) 0%, transparent 60%)',
      glow1: 'oklch(0.94 0.04 240 / 0.4)',
      glow2: 'oklch(0.9 0.03 220 / 0.25)',
      iconColor: '#7dd3fc',
      Icon: CloudSnow,
      textColor: '#164e63',
      textMuted: 'oklch(0.5 0.02 240)',
      accentColor: '#0891b2',
      cardBg: 'oklch(1 0 0 / 0.5)',
      particleColor: '#e0f2fe',
      mood: '银装素裹',
      isDark: false,
    };
  }

  // 雾 / 霾 — 朦胧暖灰
  if (code >= 500 && code <= 515) {
    return {
      bgGradient: 'linear-gradient(160deg, oklch(0.8 0.02 80) 0%, oklch(0.77 0.018 75) 50%, oklch(0.75 0.015 70) 100%)',
      bgGradientRadial: 'radial-gradient(ellipse at 70% 30%, oklch(0.85 0.03 80 / 0.3) 0%, transparent 60%)',
      glow1: 'oklch(0.85 0.04 80 / 0.3)',
      glow2: 'oklch(0.82 0.03 60 / 0.2)',
      iconColor: '#a8a29e',
      Icon: CloudFog,
      textColor: '#451a03',
      textMuted: 'oklch(0.5 0.02 80)',
      accentColor: '#a8a29e',
      cardBg: 'oklch(1 0 0 / 0.4)',
      particleColor: '#d6d3d1',
      mood: '雾霭沉沉',
      isDark: false,
    };
  }

  // 沙尘 — 暖黄土色
  if (code >= 503 && code <= 508) {
    return {
      bgGradient: 'linear-gradient(160deg, oklch(0.78 0.07 80) 0%, oklch(0.75 0.06 75) 50%, oklch(0.72 0.05 70) 100%)',
      bgGradientRadial: 'radial-gradient(ellipse at 60% 40%, oklch(0.83 0.08 80 / 0.35) 0%, transparent 60%)',
      glow1: 'oklch(0.84 0.09 80 / 0.35)',
      glow2: 'oklch(0.8 0.07 60 / 0.2)',
      iconColor: '#d4a373',
      Icon: Wind,
      textColor: '#5c3d0a',
      textMuted: 'oklch(0.5 0.03 80)',
      accentColor: '#b45309',
      cardBg: 'oklch(1 0 0 / 0.4)',
      particleColor: '#e9c46a',
      mood: '风沙漫天',
      isDark: false,
    };
  }

  // 默认 — 柔和蓝紫
  return {
    bgGradient: 'linear-gradient(160deg, oklch(0.78 0.06 270) 0%, oklch(0.75 0.05 265) 50%, oklch(0.72 0.045 260) 100%)',
    bgGradientRadial: 'radial-gradient(ellipse at 75% 25%, oklch(0.85 0.07 270 / 0.4) 0%, transparent 60%)',
    glow1: 'oklch(0.85 0.08 270 / 0.4)',
    glow2: 'oklch(0.8 0.06 250 / 0.25)',
    iconColor: '#a5b4fc',
    Icon: Sun,
    textColor: '#312e81',
    textMuted: 'oklch(0.5 0.03 270)',
    accentColor: '#6366f1',
    cardBg: 'oklch(1 0 0 / 0.45)',
    particleColor: '#c7d2fe',
    mood: '天气宜人',
    isDark: false,
  };
}

/* ─────────────── 今日简报工具函数 ─────────────── */

const typeIcons: Record<string, React.ElementType> = {
  focus_reminder: Zap,
  deadline_warning: AlertTriangle,
  break_suggestion: Coffee,
  reading_recommendation: BookOpen,
  daily_brief: Sunrise,
  pattern_insight: TrendingUp,
};

/* ─────────────── 子组件：动态氛围背景 ─────────────── */

function AmbientBackground({ theme }: { theme: ReturnType<typeof getWeatherTheme> }) {
  return (
    <>
      {/* 底层渐变 */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: theme.bgGradient }} />
      {/* 径向高光 */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: theme.bgGradientRadial }} />
      {/* 动态光晕 1 */}
      <div
        className="absolute pointer-events-none animate-drift-slow"
        style={{
          width: '50%',
          height: '50%',
          top: '-5%',
          right: '5%',
          background: `radial-gradient(circle, ${theme.glow1} 0%, transparent 70%)`,
          filter: 'blur(50px)',
        }}
      />
      {/* 动态光晕 2 */}
      <div
        className="absolute pointer-events-none animate-drift-slow-reverse"
        style={{
          width: '40%',
          height: '40%',
          bottom: '5%',
          left: '0%',
          background: `radial-gradient(circle, ${theme.glow2} 0%, transparent 70%)`,
          filter: 'blur(60px)',
        }}
      />
      {/* 顶部高光条 */}
      <div
        className="absolute top-0 left-[10%] right-[10%] h-px pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${theme.particleColor}50 30%, ${theme.particleColor}70 50%, ${theme.particleColor}50 70%, transparent 100%)`,
        }}
      />
      {/* 底部微光 */}
      <div
        className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
        style={{
          background: `linear-gradient(to top, ${theme.isDark ? 'oklch(0 0 0 / 0.15)' : 'oklch(1 0 0 / 0.2)'} 0%, transparent 100%)`,
        }}
      />
    </>
  );
}

/* ─────────────── 子组件：天气图标（带动画光晕） ─────────────── */

function WeatherIcon({ icon, size = 44 }: { icon: string; size?: number }) {
  const { Icon, iconColor } = getWeatherTheme(icon);
  return (
    <div className="relative flex items-center justify-center">
      <Icon
        className="relative z-10 transition-all duration-700"
        style={{
          width: size,
          height: size,
          color: iconColor,
          filter: `drop-shadow(0 2px 10px ${iconColor}50)`,
        }}
      />
      {/* 图标光晕 */}
      <div
        className="absolute inset-0 animate-pulse-slow pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${iconColor}25 0%, transparent 70%)`,
          transform: 'scale(2.2)',
          filter: 'blur(10px)',
        }}
      />
    </div>
  );
}

/* ─────────────── 子组件：快捷按钮 ─────────────── */

function ShortcutButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: 'oklch(1 0 0 / 0.15)',
        border: '1px solid oklch(1 0 0 / 0.2)',
        color: 'inherit',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 2px 8px oklch(0 0 0 / 0.06)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'oklch(1 0 0 / 0.3)';
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'oklch(1 0 0 / 0.35)';
        (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px oklch(0 0 0 / 0.1)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'oklch(1 0 0 / 0.15)';
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'oklch(1 0 0 / 0.2)';
        (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 8px oklch(0 0 0 / 0.06)';
      }}
    >
      <span className="transition-transform duration-200 group-hover:scale-110">
        {icon}
      </span>
      {label}
    </button>
  );
}

/* ─────────────── 子组件：简报卡片 ─────────────── */

function BriefCard({
  theme,
  suggestion,
  onAccept,
  onDismiss,
}: {
  theme: ReturnType<typeof getWeatherTheme>;
  suggestion: ProactiveSuggestion | undefined;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const Icon = suggestion ? (typeIcons[suggestion.type] ?? Zap) : Sparkles;

  return (
    <div
      className="relative rounded-xl overflow-hidden transition-all duration-500"
      style={{
        background: theme.cardBg,
        backdropFilter: 'blur(20px) saturate(1.3)',
        border: '1px solid oklch(1 0 0 / 0.2)',
        boxShadow: `0 4px 24px oklch(0 0 0 / 0.06), inset 0 1px 0 oklch(1 0 0 / 0.2)`,
      }}
    >
      <div className="p-4">
        {!suggestion ? (
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'oklch(1 0 0 / 0.2)' }}
            >
              <Icon className="w-4 h-4" style={{ color: theme.accentColor }} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold" style={{ color: theme.textColor }}>
                今日简报
              </div>
              <div className="text-xs mt-0.5" style={{ color: theme.textMuted }}>
                AI 正在观察你的工作节律…
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: 'oklch(1 0 0 / 0.2)' }}
            >
              <Icon className="w-4 h-4" style={{ color: theme.accentColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold" style={{ color: theme.textColor }}>
                {suggestion.title}
              </div>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: theme.textMuted }}>
                {suggestion.content}
              </p>
              <div className="flex items-center gap-2 mt-2.5">
                {suggestion.actionType !== 'dismiss' && (
                  <button
                    onClick={onAccept}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90"
                    style={{
                      background: 'oklch(1 0 0 / 0.25)',
                      border: '1px solid oklch(1 0 0 / 0.35)',
                      color: theme.textColor,
                    }}
                  >
                    <Check className="w-3 h-3" />
                    {suggestion.actionType === 'start_pomodoro'
                      ? '开始专注'
                      : suggestion.actionType === 'navigate'
                        ? '前往查看'
                        : '采纳'}
                  </button>
                )}
                <button
                  onClick={onDismiss}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-white/10"
                  style={{
                    background: theme.isDark ? 'oklch(0 0 0 / 0.15)' : 'oklch(0 0 0 / 0.06)',
                    border: '1px solid oklch(1 0 0 / 0.1)',
                    color: theme.textMuted,
                  }}
                >
                  <X className="w-3 h-3" />
                  忽略
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────── 主组件：HeaderOverview ─────────────── */

export function HeaderOverview() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const greeting = useMemo(() => getGreeting(), []);
  const todayStr = useMemo(() => formatFullDate(new Date()), []);
  const name = user?.name || user?.email?.split('@')[0] || '研究员';

  /* —— 天气状态 —— */
  const [city, setCity] = useState<string>(() => localStorage.getItem(CITY_STORAGE_KEY) || DEFAULT_CITY);
  const [inputCity, setInputCity] = useState(city);
  const [isEditing, setIsEditing] = useState(false);
  const [shouldFetch, setShouldFetch] = useState(false);
  const [localWeather, setLocalWeather] = useState<WeatherCurrent | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: weather, isLoading, error } = useWeather(city, shouldFetch);
  const refreshWeather = useRefreshWeather();

  useEffect(() => {
    const cached = localStorage.getItem(WEATHER_CACHE_KEY);
    if (cached) {
      try {
        const parsed: CachedWeather = JSON.parse(cached);
        if (parsed.city === city && Date.now() - parsed.cachedAt < CACHE_TTL_MS) {
          setLocalWeather(parsed.data);
        }
      } catch { /* 忽略 */ }
    }
    setShouldFetch(true);
  }, [city]);

  useEffect(() => {
    if (weather) {
      setLocalWeather(weather);
      const cache: CachedWeather = { city, data: weather, cachedAt: Date.now() };
      localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(cache));
    }
  }, [weather, city]);

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
      localStorage.removeItem(WEATHER_CACHE_KEY);
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
    localStorage.removeItem(WEATHER_CACHE_KEY);
    setShouldFetch(true);
    refreshWeather.mutate(city);
  }, [city, refreshWeather]);

  /* —— 简报状态 —— */
  const { suggestions, fetchPending, submitFeedback, removeLocal } = useProactiveStore();

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const suggestion = suggestions.find((s) => s.type === 'daily_brief') ?? suggestions[0];

  const handleAccept = () => {
    if (!suggestion) return;
    submitFeedback(suggestion.id, 'accepted');
    if (suggestion.actionType === 'navigate') {
      const path = (suggestion.actionPayload?.path as string) ?? '/';
      window.location.href = path;
    } else if (suggestion.actionType === 'start_pomodoro') {
      window.location.href = '/pomodoro';
    }
  };

  const handleDismiss = () => {
    if (!suggestion) return;
    submitFeedback(suggestion.id, 'dismissed');
    removeLocal(suggestion.id);
  };

  /* —— 天气主题计算 —— */
  const theme = localWeather
    ? getWeatherTheme(localWeather.icon)
    : getWeatherTheme('100');

  return (
    <div
      className="rounded-2xl overflow-hidden relative noise-texture"
      style={{
        minHeight: '200px',
        boxShadow: '0 8px 32px oklch(0 0 0 / 0.1), 0 0 0 1px oklch(1 0 0 / 0.1) inset',
      }}
    >
      {/* 氛围背景层 */}
      <AmbientBackground theme={theme} />

      {/* 内容层 */}
      <div className="relative z-10 p-5">
        {/* 上半部分：问候 + 天气 融合区域 */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
          {/* 左侧：问候语 + 快捷操作 */}
          <div className="flex-1 min-w-0">
            {/* 问候行 */}
            <div className="flex items-center gap-3 flex-wrap">
              <h1
                className="text-2xl font-bold tracking-tight"
                style={{ color: theme.textColor }}
              >
                {greeting}，{name}
              </h1>
              {localWeather && (
                <span
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-medium tracking-wide"
                  style={{
                    background: 'oklch(1 0 0 / 0.2)',
                    color: theme.textMuted,
                    border: '1px solid oklch(1 0 0 / 0.15)',
                  }}
                >
                  {theme.mood}
                </span>
              )}
            </div>
            {/* 装饰分隔 */}
            <div className="flex items-center gap-2 mt-2">
              <div className="h-px w-8 rounded-full" style={{ background: 'oklch(1 0 0 / 0.25)' }} />
              <Sparkles className="w-3 h-3" style={{ color: theme.textMuted, opacity: 0.6 }} />
              <div className="h-px w-8 rounded-full" style={{ background: 'oklch(1 0 0 / 0.25)' }} />
            </div>
            <p className="text-sm mt-2 font-medium" style={{ color: theme.textMuted }}>
              {todayStr}
            </p>

            {/* 快捷按钮 */}
            <div className="flex items-center gap-2 flex-wrap mt-4">
              <ShortcutButton
                icon={<FileText className="w-3.5 h-3.5" />}
                label="新建笔记"
                onClick={() => navigate('/notes', { state: { createNew: true } })}
              />
              <ShortcutButton
                icon={<Plus className="w-3.5 h-3.5" />}
                label="新建任务"
                onClick={() => navigate('/tasks', { state: { createNew: true } })}
              />
              <ShortcutButton
                icon={<Timer className="w-3.5 h-3.5" />}
                label="快速专注"
                onClick={() => navigate('/pomodoro')}
              />
            </div>
          </div>

          {/* 右侧：天气信息 */}
          <div className="flex-shrink-0">
            {/* 城市 + 刷新 */}
            <div className="flex items-center justify-end gap-2 mb-1.5">
              {isEditing ? (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: theme.textMuted }} />
                  <input
                    ref={inputRef}
                    value={inputCity}
                    onChange={(e) => setInputCity(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleSaveCity}
                    className="w-20 bg-transparent text-sm font-medium outline-none border-b border-dashed text-center"
                    style={{ color: theme.textColor, borderColor: 'oklch(1 0 0 / 0.3)' }}
                    placeholder="城市"
                  />
                  <button
                    onClick={handleSaveCity}
                    className="p-1 rounded-md transition-colors hover:bg-white/20"
                    style={{ color: theme.textMuted }}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button onClick={() => setIsEditing(true)} className="flex items-center gap-1.5 group">
                  <MapPin className="w-3.5 h-3.5" style={{ color: theme.textMuted }} />
                  <span className="text-sm font-medium" style={{ color: theme.textColor }}>
                    {city}
                  </span>
                  <Settings className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: theme.textMuted }} />
                </button>
              )}
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="p-1.5 rounded-md transition-all hover:bg-white/20 disabled:opacity-50"
                style={{ color: theme.textMuted }}
                title="刷新天气"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* 天气数据 */}
            {error ? (
              <div className="flex flex-col items-center py-2 text-center">
                <Cloud className="w-6 h-6 mb-1" style={{ color: theme.textMuted }} />
                <p className="text-xs" style={{ color: theme.textMuted }}>
                  {error.message.includes('未配置')
                    ? '天气服务未配置'
                    : error.message.includes('未找到')
                      ? `未找到城市「${city}」`
                      : '天气数据获取失败'}
                </p>
              </div>
            ) : isLoading && !localWeather ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: theme.textMuted }} />
              </div>
            ) : localWeather ? (
              <div className="flex items-center gap-4">
                {/* 天气图标 */}
                <WeatherIcon icon={localWeather.icon} size={44} />
                {/* 温度与天气文字 */}
                <div>
                  <div className="flex items-baseline gap-1">
                    <span
                      className="text-3xl font-bold tracking-tighter"
                      style={{ color: theme.textColor }}
                    >
                      {localWeather.temp}
                    </span>
                    <span className="text-base font-light" style={{ color: theme.textMuted }}>
                      °C
                    </span>
                  </div>
                  <div className="text-sm font-medium" style={{ color: theme.textColor }}>
                    {localWeather.text}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px]" style={{ color: theme.textMuted }}>
                    <span>体感 {localWeather.feelsLike}°</span>
                    <span className="w-px h-2.5" style={{ background: 'oklch(1 0 0 / 0.3)' }} />
                    <span>{localWeather.windDir} {localWeather.windScale}级</span>
                  </div>
                </div>
                {/* 垂直分隔线 + 实时时钟 */}
                <div className="h-10 w-px mx-1" style={{ background: 'oklch(1 0 0 / 0.2)' }} />
                <LiveClock theme={theme} />
              </div>
            ) : null}
          </div>
        </div>

        {/* 下半部分：简报卡片 */}
        <div className="mt-5">
          <BriefCard
            theme={theme}
            suggestion={suggestion}
            onAccept={handleAccept}
            onDismiss={handleDismiss}
          />
        </div>
      </div>
    </div>
  );
}
