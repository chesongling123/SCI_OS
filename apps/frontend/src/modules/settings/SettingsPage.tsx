import { useState, useEffect, useCallback } from 'react';
import {
  Palette,
  Bot,
  Timer,
  CalendarDays,
  BookOpen,
  Bell,
  Database,
  Info,
  Save,
  RotateCcw,
  Check,
  Moon,
  Sun,
  Monitor,
  Sparkles,
} from 'lucide-react';
import { useSettingsStore } from '../../stores/settings';
import { useThemeStore } from '../../stores/theme';
import type { UpdateSettingsDto } from '@research/shared-types';

type SectionKey =
  | 'appearance'
  | 'ai'
  | 'pomodoro'
  | 'calendar'
  | 'reference'
  | 'notification'
  | 'proactive'
  | 'data'
  | 'about';

interface SectionDef {
  key: SectionKey;
  label: string;
  icon: React.ElementType;
}

const sections: SectionDef[] = [
  { key: 'appearance', label: '外观', icon: Palette },
  { key: 'ai', label: 'AI 助手', icon: Bot },
  { key: 'proactive', label: '主动建议', icon: Sparkles },
  { key: 'pomodoro', label: '番茄钟', icon: Timer },
  { key: 'calendar', label: '日程', icon: CalendarDays },
  { key: 'reference', label: '文献', icon: BookOpen },
  { key: 'notification', label: '通知', icon: Bell },
  { key: 'data', label: '数据', icon: Database },
  { key: 'about', label: '关于', icon: Info },
];

/**
 * 玻璃卡片容器
 */
function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl p-6 ${className}`}
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px) saturate(1.3)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--glass-shadow)',
      }}
    >
      {children}
    </div>
  );
}

/**
 * 设置行：标签 + 控件
 */
function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-4 border-b last:border-b-0" style={{ borderColor: 'var(--glass-border)' }}>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {label}
        </div>
        {description && (
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {description}
          </div>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

/**
 * 分段选择器
 */
function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { label: string; value: T; icon?: React.ElementType }[];
  onChange: (val: T) => void;
}) {
  return (
    <div
      className="inline-flex rounded-xl p-1 gap-1"
      style={{ background: 'var(--glass-bg-hover)', border: '1px solid var(--glass-border)' }}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              active ? 'text-white' : 'hover:opacity-80'
            }`}
            style={
              active
                ? { background: 'oklch(0.52 0.18 260)' }
                : { color: 'var(--text-secondary)' }
            }
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * 开关
 */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative w-11 h-6 rounded-full transition-colors"
      style={{
        background: checked ? 'oklch(0.52 0.18 260)' : 'var(--glass-bg-hover)',
        border: '1px solid var(--glass-border)',
      }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }}
      />
    </button>
  );
}

/**
 * 滑块
 */
function Slider({
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-32 accent-primary"
        style={{ accentColor: 'oklch(0.52 0.18 260)' }}
      />
      <span className="text-xs font-medium tabular-nums w-12 text-right" style={{ color: 'var(--text-secondary)' }}>
        {value}{unit}
      </span>
    </div>
  );
}

/**
 * 数字输入
 */
function NumberInput({
  value,
  min,
  max,
  unit = '',
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10);
          if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
        }}
        className="w-16 px-2 py-1 text-xs rounded-lg text-center outline-none"
        style={{
          background: 'var(--glass-bg-hover)',
          border: '1px solid var(--glass-border)',
          color: 'var(--text-primary)',
        }}
      />
      {unit && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{unit}</span>}
    </div>
  );
}

/**
 * 下拉选择
 */
function Select<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { label: string; value: T }[];
  onChange: (val: T) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="px-3 py-1.5 text-xs rounded-lg outline-none cursor-pointer"
      style={{
        background: 'var(--glass-bg-hover)',
        border: '1px solid var(--glass-border)',
        color: 'var(--text-primary)',
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

/**
 * 文本域
 */
function TextArea({
  value,
  placeholder,
  rows = 3,
  onChange,
}: {
  value: string;
  placeholder?: string;
  rows?: number;
  onChange: (v: string) => void;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2 text-xs rounded-lg outline-none resize-none"
      style={{
        background: 'var(--glass-bg-hover)',
        border: '1px solid var(--glass-border)',
        color: 'var(--text-primary)',
      }}
    />
  );
}

// ============================================
// 各设置分区组件
// ============================================

function AppearanceSection() {
  const { theme, glassIntensity, fontSize, updateField } = useSettingsStore();
  const { setMode } = useThemeStore();

  const handleThemeChange = (v: 'light' | 'dark' | 'system') => {
    updateField('theme', v);
    setMode(v);
  };

  return (
    <GlassCard>
      <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>外观</h3>
      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>自定义界面主题与视觉效果</p>

      <SettingRow label="主题模式" description="选择浅色、深色或跟随系统">
        <SegmentedControl
          value={theme as 'light' | 'dark' | 'system'}
          options={[
            { label: '浅色', value: 'light', icon: Sun },
            { label: '深色', value: 'dark', icon: Moon },
            { label: '跟随系统', value: 'system', icon: Monitor },
          ]}
          onChange={handleThemeChange}
        />
      </SettingRow>

      <SettingRow label="液态玻璃强度" description="调整界面模糊与透明效果">
        <Slider value={glassIntensity} min={0} max={200} step={10} unit="%" onChange={(v) => updateField('glassIntensity', v)} />
      </SettingRow>

      <SettingRow label="字体大小">
        <SegmentedControl
          value={fontSize as 'small' | 'medium' | 'large'}
          options={[
            { label: '小', value: 'small' },
            { label: '中', value: 'medium' },
            { label: '大', value: 'large' },
          ]}
          onChange={(v) => updateField('fontSize', v)}
        />
      </SettingRow>
    </GlassCard>
  );
}

function AiSection() {
  const {
    llmProvider, llmModel, temperature, maxTokens, systemPrompt,
    functionCalling, ragThreshold, ragTopK, streamingOutput, updateField,
  } = useSettingsStore();

  return (
    <GlassCard>
      <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>AI 助手</h3>
      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>配置大语言模型与检索参数</p>

      <SettingRow label="LLM 提供商">
        <Select
          value={llmProvider}
          options={[
            { label: 'Kimi Coding', value: 'kimi' },
            { label: 'OpenAI', value: 'openai' },
            { label: 'DeepSeek', value: 'deepseek' },
            { label: '本地 Ollama', value: 'ollama' },
          ]}
          onChange={(v) => updateField('llmProvider', v)}
        />
      </SettingRow>

      <SettingRow label="默认模型">
        <input
          type="text"
          value={llmModel}
          onChange={(e) => updateField('llmModel', e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg outline-none w-40"
          style={{
            background: 'var(--glass-bg-hover)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-primary)',
          }}
        />
      </SettingRow>

      <SettingRow label="Temperature" description="值越低回答越确定，越高越创造性">
        <Slider value={temperature} min={0} max={2} step={0.1} onChange={(v) => updateField('temperature', v)} />
      </SettingRow>

      <SettingRow label="最大 Token">
        <NumberInput value={maxTokens} min={256} max={8192} onChange={(v) => updateField('maxTokens', v)} />
      </SettingRow>

      <SettingRow label="系统提示词" description="自定义 AI 角色与行为指令">
        <div className="w-64">
          <TextArea
            value={systemPrompt || ''}
            placeholder="你是一个科研助手..."
            onChange={(v) => updateField('systemPrompt', v || null)}
          />
        </div>
      </SettingRow>

      <SettingRow label="Function Calling" description="允许 AI 查询本地数据库">
        <Toggle checked={functionCalling} onChange={(v) => updateField('functionCalling', v)} />
      </SettingRow>

      <SettingRow label="流式输出" description="逐 token 实时返回回复">
        <Toggle checked={streamingOutput} onChange={(v) => updateField('streamingOutput', v)} />
      </SettingRow>

      <SettingRow label="RAG 相似度阈值" description="语义检索过滤阈值">
        <Slider value={ragThreshold} min={0} max={1} step={0.05} onChange={(v) => updateField('ragThreshold', v)} />
      </SettingRow>

      <SettingRow label="RAG 返回文档数">
        <NumberInput value={ragTopK} min={1} max={20} onChange={(v) => updateField('ragTopK', v)} />
      </SettingRow>
    </GlassCard>
  );
}

function PomodoroSection() {
  const {
    pomodoroFocus, pomodoroShortBreak, pomodoroLongBreak,
    pomodoroAutoBreak, pomodoroAutoFocus, pomodoroDailyGoal, updateField,
  } = useSettingsStore();

  return (
    <GlassCard>
      <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>番茄钟</h3>
      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>自定义专注计时器参数</p>

      <SettingRow label="专注时长">
        <NumberInput value={pomodoroFocus} min={1} max={120} unit="分钟" onChange={(v) => updateField('pomodoroFocus', v)} />
      </SettingRow>

      <SettingRow label="短休息时长">
        <NumberInput value={pomodoroShortBreak} min={1} max={60} unit="分钟" onChange={(v) => updateField('pomodoroShortBreak', v)} />
      </SettingRow>

      <SettingRow label="长休息时长">
        <NumberInput value={pomodoroLongBreak} min={1} max={120} unit="分钟" onChange={(v) => updateField('pomodoroLongBreak', v)} />
      </SettingRow>

      <SettingRow label="自动开始休息" description="专注结束后自动进入休息">
        <Toggle checked={pomodoroAutoBreak} onChange={(v) => updateField('pomodoroAutoBreak', v)} />
      </SettingRow>

      <SettingRow label="自动开始专注" description="休息结束后自动开始下一个番茄钟">
        <Toggle checked={pomodoroAutoFocus} onChange={(v) => updateField('pomodoroAutoFocus', v)} />
      </SettingRow>

      <SettingRow label="每日番茄目标">
        <NumberInput value={pomodoroDailyGoal} min={1} max={50} unit="个" onChange={(v) => updateField('pomodoroDailyGoal', v)} />
      </SettingRow>
    </GlassCard>
  );
}

function CalendarSection() {
  const { weekStart, defaultCalendarView, defaultReminder, updateField } = useSettingsStore();

  return (
    <GlassCard>
      <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>日程</h3>
      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>日历视图与默认行为</p>

      <SettingRow label="周起始日">
        <SegmentedControl
          value={weekStart as 'monday' | 'sunday'}
          options={[
            { label: '周一', value: 'monday' },
            { label: '周日', value: 'sunday' },
          ]}
          onChange={(v) => updateField('weekStart', v)}
        />
      </SettingRow>

      <SettingRow label="默认视图">
        <SegmentedControl
          value={defaultCalendarView as 'month' | 'week' | 'day'}
          options={[
            { label: '月', value: 'month' },
            { label: '周', value: 'week' },
            { label: '日', value: 'day' },
          ]}
          onChange={(v) => updateField('defaultCalendarView', v)}
        />
      </SettingRow>

      <SettingRow label="默认提醒时间" description="新建事件的默认提前提醒">
        <NumberInput value={defaultReminder} min={0} max={1440} unit="分钟" onChange={(v) => updateField('defaultReminder', v)} />
      </SettingRow>
    </GlassCard>
  );
}

function ReferenceSection() {
  const { defaultCitationFormat, updateField } = useSettingsStore();

  return (
    <GlassCard>
      <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>文献管理</h3>
      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>引用与导入偏好</p>

      <SettingRow label="默认引用格式">
        <Select
          value={defaultCitationFormat}
          options={[
            { label: 'GB/T 7714', value: 'gb7714' },
            { label: 'APA', value: 'apa' },
            { label: 'MLA', value: 'mla' },
            { label: 'Chicago', value: 'chicago' },
            { label: 'BibTeX', value: 'bibtex' },
          ]}
          onChange={(v) => updateField('defaultCitationFormat', v)}
        />
      </SettingRow>
    </GlassCard>
  );
}

function ProactiveSection() {
  const {
    proactiveSuggestions, proactiveFrequency, proactiveChannels,
    quietHoursStart, quietHoursEnd, updateField,
  } = useSettingsStore();

  const toggleChannel = (key: 'toast' | 'browser' | 'inline') => {
    const next = { ...proactiveChannels, [key]: !proactiveChannels[key] };
    updateField('proactiveChannels', next);
  };

  return (
    <GlassCard>
      <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>主动建议</h3>
      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>AI 主动提醒与个性化建议</p>

      <SettingRow label="启用主动建议" description="AI 根据你的日程、任务和行为模式主动发起建议">
        <Toggle checked={proactiveSuggestions} onChange={(v) => updateField('proactiveSuggestions', v)} />
      </SettingRow>

      <SettingRow label="建议频率" description="控制每日建议推送的上限">
        <SegmentedControl
          value={proactiveFrequency as 'low' | 'medium' | 'high'}
          options={[
            { label: '低频', value: 'low' },
            { label: '中频', value: 'medium' },
            { label: '高频', value: 'high' },
          ]}
          onChange={(v) => updateField('proactiveFrequency', v)}
        />
      </SettingRow>

      <SettingRow label="应用内通知（Toast）">
        <Toggle checked={proactiveChannels.toast} onChange={() => toggleChannel('toast')} />
      </SettingRow>

      <SettingRow label="浏览器桌面通知">
        <Toggle checked={proactiveChannels.browser} onChange={() => toggleChannel('browser')} />
      </SettingRow>

      <SettingRow label="AI 面板内联建议">
        <Toggle checked={proactiveChannels.inline} onChange={() => toggleChannel('inline')} />
      </SettingRow>

      <SettingRow label="免打扰开始">
        <input
          type="time"
          value={quietHoursStart ?? '23:00'}
          onChange={(e) => updateField('quietHoursStart', e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg outline-none"
          style={{
            background: 'var(--glass-bg-hover)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-primary)',
          }}
        />
      </SettingRow>

      <SettingRow label="免打扰结束">
        <input
          type="time"
          value={quietHoursEnd ?? '08:00'}
          onChange={(e) => updateField('quietHoursEnd', e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg outline-none"
          style={{
            background: 'var(--glass-bg-hover)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-primary)',
          }}
        />
      </SettingRow>
    </GlassCard>
  );
}

function NotificationSection() {
  const { desktopNotification, pomodoroSound, eventReminder, updateField } = useSettingsStore();

  return (
    <GlassCard>
      <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>通知</h3>
      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>控制各类提醒行为</p>

      <SettingRow label="桌面通知" description="允许浏览器推送系统级通知">
        <Toggle checked={desktopNotification} onChange={(v) => updateField('desktopNotification', v)} />
      </SettingRow>

      <SettingRow label="番茄钟提示音" description="计时开始/结束时播放声音">
        <Toggle checked={pomodoroSound} onChange={(v) => updateField('pomodoroSound', v)} />
      </SettingRow>

      <SettingRow label="日程提醒" description="事件开始前弹出提醒">
        <Toggle checked={eventReminder} onChange={(v) => updateField('eventReminder', v)} />
      </SettingRow>
    </GlassCard>
  );
}

function DataSection() {
  const { autoBackup, backupFrequency, updateField } = useSettingsStore();

  const handleExport = useCallback(() => {
    // 预留：数据导出功能
    alert('数据导出功能开发中，将支持 JSON / CSV / Markdown 打包下载');
  }, []);

  return (
    <GlassCard>
      <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>数据与隐私</h3>
      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>备份、导出与本地数据管理</p>

      <SettingRow label="自动备份" description="按周期自动导出数据快照">
        <Toggle checked={autoBackup} onChange={(v) => updateField('autoBackup', v)} />
      </SettingRow>

      <SettingRow label="备份频率">
        <Select
          value={backupFrequency}
          options={[
            { label: '每日', value: 'daily' },
            { label: '每周', value: 'weekly' },
            { label: '每月', value: 'monthly' },
          ]}
          onChange={(v) => updateField('backupFrequency', v)}
        />
      </SettingRow>

      <div className="flex gap-3 mt-4 pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
        <button
          onClick={handleExport}
          className="px-4 py-2 rounded-xl text-xs font-medium transition-all"
          style={{
            background: 'var(--glass-bg-hover)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-primary)',
          }}
        >
          导出全部数据
        </button>
        <button
          onClick={() => alert('清除缓存功能开发中')}
          className="px-4 py-2 rounded-xl text-xs font-medium transition-all"
          style={{
            background: 'var(--glass-bg-hover)',
            border: '1px solid var(--glass-border)',
            color: 'var(--destructive)',
          }}
        >
          清除本地缓存
        </button>
      </div>
    </GlassCard>
  );
}

function AboutSection() {
  return (
    <GlassCard>
      <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>关于 ResearchOS</h3>
      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>版本信息与项目链接</p>

      <div className="space-y-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
        <div className="flex justify-between">
          <span>当前版本</span>
          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>v0.2.0</span>
        </div>
        <div className="flex justify-between">
          <span>构建时间</span>
          <span>2026-04-26</span>
        </div>
        <div className="flex justify-between">
          <span>项目仓库</span>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="hover:underline"
            style={{ color: 'oklch(0.52 0.18 260)' }}
          >
            GitHub →
          </a>
        </div>
        <div className="flex justify-between">
          <span>反馈问题</span>
          <a
            href="https://github.com/issues"
            target="_blank"
            rel="noreferrer"
            className="hover:underline"
            style={{ color: 'oklch(0.52 0.18 260)' }}
          >
            提交 Issue →
          </a>
        </div>
      </div>
    </GlassCard>
  );
}

const sectionComponents: Record<SectionKey, React.FC> = {
  appearance: AppearanceSection,
  ai: AiSection,
  proactive: ProactiveSection,
  pomodoro: PomodoroSection,
  calendar: CalendarSection,
  reference: ReferenceSection,
  notification: NotificationSection,
  data: DataSection,
  about: AboutSection,
};

// ============================================
// 主页面
// ============================================

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SectionKey>('appearance');
  const { fetchSettings, updateSettings, isLoading, isSaving, error, theme } = useSettingsStore();
  const { setMode } = useThemeStore();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // 设置加载后同步主题到全局 theme store
  useEffect(() => {
    if (theme) setMode(theme as 'light' | 'dark' | 'system');
  }, [theme, setMode]);

  const handleSave = useCallback(async () => {
    const state = useSettingsStore.getState();
    const dto: UpdateSettingsDto = {
      theme: state.theme as UpdateSettingsDto['theme'],
      glassIntensity: state.glassIntensity,
      fontSize: state.fontSize as UpdateSettingsDto['fontSize'],
      sidebarCollapsed: state.sidebarCollapsed,
      llmProvider: state.llmProvider,
      llmModel: state.llmModel,
      temperature: state.temperature,
      maxTokens: state.maxTokens,
      systemPrompt: state.systemPrompt ?? undefined,
      functionCalling: state.functionCalling,
      ragThreshold: state.ragThreshold,
      ragTopK: state.ragTopK,
      streamingOutput: state.streamingOutput,
      pomodoroFocus: state.pomodoroFocus,
      pomodoroShortBreak: state.pomodoroShortBreak,
      pomodoroLongBreak: state.pomodoroLongBreak,
      pomodoroAutoBreak: state.pomodoroAutoBreak,
      pomodoroAutoFocus: state.pomodoroAutoFocus,
      pomodoroDailyGoal: state.pomodoroDailyGoal,
      weekStart: state.weekStart as UpdateSettingsDto['weekStart'],
      defaultCalendarView: state.defaultCalendarView as UpdateSettingsDto['defaultCalendarView'],
      defaultReminder: state.defaultReminder,
      defaultCitationFormat: state.defaultCitationFormat as UpdateSettingsDto['defaultCitationFormat'],
      desktopNotification: state.desktopNotification,
      pomodoroSound: state.pomodoroSound,
      eventReminder: state.eventReminder,
      autoBackup: state.autoBackup,
      backupFrequency: state.backupFrequency as UpdateSettingsDto['backupFrequency'],
      proactiveSuggestions: state.proactiveSuggestions,
      proactiveFrequency: state.proactiveFrequency as UpdateSettingsDto['proactiveFrequency'],
      proactiveChannels: state.proactiveChannels,
      quietHoursStart: state.quietHoursStart ?? null,
      quietHoursEnd: state.quietHoursEnd ?? null,
    };
    await updateSettings(dto);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [updateSettings]);

  const handleReset = useCallback(() => {
    if (confirm('确定要放弃未保存的更改并重新加载服务器设置吗？')) {
      fetchSettings();
    }
  }, [fetchSettings]);

  const ActiveComponent = sectionComponents[activeSection];

  return (
    <div className="flex gap-6 min-h-[70vh]">
      {/* 左侧导航 */}
      <aside className="w-52 flex-shrink-0">
        <div
          className="sticky top-24 rounded-2xl p-3"
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(20px) saturate(1.3)',
            WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
            border: '1px solid var(--glass-border)',
            boxShadow: 'var(--glass-shadow)',
          }}
        >
          <div className="text-xs font-semibold px-3 py-2 mb-1" style={{ color: 'var(--text-muted)' }}>
            设置分类
          </div>
          <nav className="space-y-0.5">
            {sections.map((sec) => {
              const Icon = sec.icon;
              const active = activeSection === sec.key;
              return (
                <button
                  key={sec.key}
                  onClick={() => setActiveSection(sec.key)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    active ? 'text-white' : ''
                  }`}
                  style={
                    active
                      ? { background: 'oklch(0.52 0.18 260)' }
                      : { color: 'var(--text-secondary)' }
                  }
                  onMouseEnter={(e) => {
                    if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--glass-bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {sec.label}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* 右侧内容 */}
      <main className="flex-1 min-w-0 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div
              className="w-8 h-8 rounded-full border-2 animate-spin"
              style={{
                borderColor: 'var(--glass-border)',
                borderTopColor: 'oklch(0.52 0.18 260)',
              }}
            />
          </div>
        ) : error ? (
          <GlassCard>
            <div className="text-sm" style={{ color: 'var(--destructive)' }}>
              加载失败：{error}
              <button
                onClick={fetchSettings}
                className="ml-3 underline"
                style={{ color: 'oklch(0.52 0.18 260)' }}
              >
                重试
              </button>
            </div>
          </GlassCard>
        ) : (
          <>
            <ActiveComponent />

            {/* 底部操作栏 */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all"
                style={{
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-secondary)',
                }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                重置
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-medium text-white transition-all disabled:opacity-60"
                style={{ background: 'oklch(0.52 0.18 260)' }}
              >
                {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                {isSaving ? '保存中…' : saved ? '已保存' : '保存更改'}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
