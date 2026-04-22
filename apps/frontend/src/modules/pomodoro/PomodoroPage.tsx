import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Square, RotateCcw, Volume2, VolumeX, Loader2 } from 'lucide-react';
import {
  useCreatePomodoroSession,
  useEndPomodoroSession,
  useTodayStats,
  useDailyStats,
} from '../../hooks/usePomodoro';
import type { PomodoroSessionResponseDto } from '@phd/shared-types';

type PomodoroMode = 'work' | 'shortBreak' | 'longBreak';

const MODE_CONFIG: Record<PomodoroMode, { label: string; duration: number; color: string }> = {
  work: { label: '专注', duration: 25 * 60, color: 'oklch(0.52 0.18 260)' },
  shortBreak: { label: '短休息', duration: 5 * 60, color: 'oklch(0.55 0.15 145)' },
  longBreak: { label: '长休息', duration: 15 * 60, color: 'oklch(0.6 0.12 85)' },
};

/**
 * 番茄钟页面（Phase 1）
 * 专注计时 + Web Audio API 白噪声 + Canvas 热力图
 */
export default function PomodoroPage() {
  // 计时器状态
  const [mode, setMode] = useState<PomodoroMode>('work');
  const [timeLeft, setTimeLeft] = useState(MODE_CONFIG.work.duration);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [interruptions, setInterruptions] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const [noiseEnabled, setNoiseEnabled] = useState(false);

  // API
  const createSession = useCreatePomodoroSession();
  const endSession = useEndPomodoroSession();
  const { data: todayStats, isLoading: statsLoading } = useTodayStats();
  const { data: dailyStats } = useDailyStats(365);

  const config = MODE_CONFIG[mode];
  const totalTime = config.duration;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  // 格式化时间显示 MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 开始计时
  const handleStart = useCallback(() => {
    if (!isRunning) {
      setIsRunning(true);
      // 如果是专注模式且没有 sessionId，创建后端会话
      if (mode === 'work' && !sessionId) {
        createSession.mutate(
          { plannedDuration: totalTime },
          {
            onSuccess: (data: PomodoroSessionResponseDto) => {
              setSessionId(data.id);
            },
          }
        );
      }
    }
  }, [isRunning, mode, sessionId, createSession, totalTime]);

  // 暂停计时
  const handlePause = useCallback(() => {
    setIsRunning(false);
    if (mode === 'work') {
      setInterruptions((prev) => prev + 1);
    }
  }, [mode]);

  // 停止/完成计时
  const handleStop = useCallback(() => {
    setIsRunning(false);
    if (sessionId && mode === 'work') {
      const actualDuration = totalTime - timeLeft;
      endSession.mutate(
        {
          id: sessionId,
          dto: { duration: actualDuration, interruptions },
        },
        {
          onSuccess: () => {
            setSessionId(null);
            setInterruptions(0);
            setTimeLeft(totalTime);
          },
        }
      );
    } else {
      setTimeLeft(totalTime);
    }
  }, [sessionId, mode, totalTime, timeLeft, interruptions, endSession]);

  // 重置计时器
  const handleReset = useCallback(() => {
    setIsRunning(false);
    setTimeLeft(totalTime);
    setSessionId(null);
    setInterruptions(0);
  }, [totalTime]);

  // 切换模式
  const handleModeChange = (newMode: PomodoroMode) => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(MODE_CONFIG[newMode].duration);
    setSessionId(null);
    setInterruptions(0);
  };

  // 计时器核心
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            // 时间到，自动停止
            if (sessionId && mode === 'work') {
              endSession.mutate({
                id: sessionId,
                dto: { duration: totalTime, interruptions },
              });
              setSessionId(null);
              setInterruptions(0);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, timeLeft, sessionId, mode, totalTime, interruptions, endSession]);

  // 白噪声生成
  const toggleNoise = useCallback(() => {
    if (noiseEnabled) {
      // 停止白噪声
      noiseNodeRef.current?.stop();
      noiseNodeRef.current = null;
      audioCtxRef.current?.close();
      audioCtxRef.current = null;
      setNoiseEnabled(false);
    } else {
      // 开始白噪声
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;

      const bufferSize = audioCtx.sampleRate * 2; // 2 秒缓冲
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);

      // 生成棕噪声（比白噪声更舒适）
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5; // 增益
      }

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      // 低通滤波器，让噪声更柔和
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;

      const gain = audioCtx.createGain();
      gain.gain.value = 0.15;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      source.start();

      noiseNodeRef.current = source;
      setNoiseEnabled(true);
    }
  }, [noiseEnabled]);

  // 页面卸载时清理
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      noiseNodeRef.current?.stop();
      audioCtxRef.current?.close();
    };
  }, []);

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 页面头部 */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">番茄钟</h1>
        <p className="text-muted-foreground text-sm mt-1">
          结构化行为数据传感器，生成 52 周专注热力图
        </p>
      </div>

      {/* 今日统计卡片 */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="今日专注"
          value={formatDuration(todayStats?.totalDuration ?? 0)}
          icon="🍅"
        />
        <StatCard
          label="完成番茄"
          value={`${todayStats?.completedCount ?? 0} 个`}
          icon="✅"
        />
        <StatCard
          label="中断次数"
          value={`${todayStats?.interruptionCount ?? 0} 次`}
          icon="⚡"
        />
      </div>

      {/* 计时器核心 */}
      <div className="flex flex-col items-center">
        {/* 模式切换 */}
        <div className="flex gap-2 mb-6">
          {(Object.keys(MODE_CONFIG) as PomodoroMode[]).map((m) => (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                mode === m
                  ? 'text-white'
                  : 'text-muted-foreground hover:text-foreground bg-white/5'
              }`}
              style={mode === m ? { background: MODE_CONFIG[m].color } : {}}
            >
              {MODE_CONFIG[m].label}
            </button>
          ))}
        </div>

        {/* 圆形进度计时器 */}
        <div className="relative w-64 h-64 mb-6">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* 背景圆 */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="var(--glass-border)"
              strokeWidth="4"
            />
            {/* 进度圆 */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={config.color}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-bold tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatTime(timeLeft)}
            </span>
            <span className="text-sm text-muted-foreground mt-1">
              {isRunning ? '进行中...' : timeLeft === 0 ? '已完成' : '准备开始'}
            </span>
          </div>
        </div>

        {/* 控制按钮 */}
        <div className="flex items-center gap-3">
          {!isRunning ? (
            <button
              onClick={handleStart}
              disabled={timeLeft === 0}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-50"
              style={{ background: config.color }}
            >
              <Play className="w-4 h-4" />
              开始
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
              style={{ background: 'oklch(0.6 0.12 85)' }}
            >
              <Pause className="w-4 h-4" />
              暂停
            </button>
          )}

          <button
            onClick={handleStop}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Square className="w-4 h-4" />
            结束
          </button>

          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            重置
          </button>

          <button
            onClick={toggleNoise}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border transition-colors ${
              noiseEnabled
                ? 'bg-white/10 border-white/30 text-foreground'
                : 'bg-white/5 border-white/10 text-muted-foreground hover:text-foreground'
            }`}
          >
            {noiseEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            白噪声
          </button>
        </div>
      </div>

      {/* 52 周热力图 */}
      <div>
        <h2 className="text-lg font-semibold mb-4">52 周专注热力图</h2>
        <Heatmap data={dailyStats ?? []} />
      </div>

      {/* 今日会话列表 */}
      {todayStats?.sessions && todayStats.sessions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">今日记录</h2>
          <div className="space-y-2">
            {todayStats.sessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between px-4 py-3 rounded-xl"
                style={{
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🍅</span>
                  <div>
                    <p className="text-sm font-medium">
                      {formatDuration(s.duration)} 专注
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.startedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                      {s.interruptions > 0 && ` · 中断 ${s.interruptions} 次`}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 统计卡片
function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div
      className="p-4 rounded-2xl"
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--glass-shadow)',
      }}
    >
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

// 格式化时长
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// Canvas 52 周热力图
function Heatmap({ data }: { data: { date: string; totalDuration: number; completedCount: number }[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 计算 52 周 × 7 天的数据矩阵
    const today = new Date();
    const weeks = 52;
    const days = 7;
    const cellSize = 12;
    const gap = 3;
    const padding = 16;

    canvas.width = padding * 2 + weeks * (cellSize + gap);
    canvas.height = padding * 2 + days * (cellSize + gap);

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 将数据转为 Map
    const dataMap = new Map(data.map((d) => [d.date, d.totalDuration]));

    // 找到最大时长用于颜色映射
    const maxDuration = Math.max(...data.map((d) => d.totalDuration), 1);

    // 绘制每个单元格
    for (let w = 0; w < weeks; w++) {
      for (let d = 0; d < days; d++) {
        const date = new Date(today);
        date.setDate(date.getDate() - ((weeks - 1 - w) * 7 + (6 - d)));
        const dateStr = date.toISOString().split('T')[0];
        const duration = dataMap.get(dateStr) ?? 0;

        const x = padding + w * (cellSize + gap);
        const y = padding + d * (cellSize + gap);

        // 颜色映射：无数据 → 浅 → 深
        let alpha = 0.1;
        if (duration > 0) {
          alpha = 0.3 + (duration / maxDuration) * 0.7;
        }

        ctx.fillStyle = `oklch(0.52 0.18 260 / ${alpha})`;
        ctx.beginPath();
        ctx.roundRect(x, y, cellSize, cellSize, 2);
        ctx.fill();
      }
    }

    // 绘制月份标签
    ctx.fillStyle = 'var(--text-muted)';
    ctx.font = '10px Geist, sans-serif';
    const monthLabels = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    for (let i = 0; i < 12; i++) {
      const weekIndex = Math.floor((i * 30) / 7);
      const x = padding + weekIndex * (cellSize + gap);
      ctx.fillText(monthLabels[i], x, padding - 4);
    }
  }, [data]);

  return (
    <div
      className="rounded-2xl p-4 overflow-x-auto"
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--glass-shadow)',
      }}
    >
      <canvas ref={canvasRef} className="block" />
      <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
        <span>少</span>
        <div className="flex gap-1">
          {[0.1, 0.3, 0.5, 0.7, 0.9].map((a) => (
            <div
              key={a}
              className="w-3 h-3 rounded-sm"
              style={{ background: `oklch(0.52 0.18 260 / ${a})` }}
            />
          ))}
        </div>
        <span>多</span>
      </div>
    </div>
  );
}
