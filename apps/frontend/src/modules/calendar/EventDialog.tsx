import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { CreateEventDto, EventResponseDto } from '@phd/shared-types';

interface EventDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (dto: CreateEventDto) => void;
  initialStart?: string;
  initialEnd?: string;
  editEvent?: EventResponseDto | null;
}

/** 颜色选项 — 使用 CSS 变量确保浅色/深色模式自适应 */
const colorOptions = [
  { value: '#3b82f6', label: '蓝', bgVar: 'var(--cal-blue-bg)' },
  { value: '#ef4444', label: '红', bgVar: 'var(--cal-red-bg)' },
  { value: '#22c55e', label: '绿', bgVar: 'var(--cal-green-bg)' },
  { value: '#f59e0b', label: '黄', bgVar: 'var(--cal-yellow-bg)' },
  { value: '#a855f7', label: '紫', bgVar: 'var(--cal-purple-bg)' },
  { value: '#ec4899', label: '粉', bgVar: 'var(--cal-pink-bg)' },
];

export default function EventDialog({ open, onClose, onSubmit, initialStart, initialEnd, editEvent }: EventDialogProps) {
  const [title, setTitle] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(colorOptions[0].value);

  useEffect(() => {
    if (open) {
      if (editEvent) {
        setTitle(editEvent.title);
        setStartAt(toDatetimeLocal(editEvent.startAt));
        setEndAt(toDatetimeLocal(editEvent.endAt));
        setIsAllDay(editEvent.isAllDay);
        setLocation(editEvent.location ?? '');
        setDescription(editEvent.description ?? '');
        setColor(editEvent.color ?? colorOptions[0].value);
      } else {
        setTitle('');
        setStartAt(initialStart ? toDatetimeLocal(initialStart) : defaultStart());
        setEndAt(initialEnd ? toDatetimeLocal(initialEnd) : defaultEnd());
        setIsAllDay(false);
        setLocation('');
        setDescription('');
        setColor(colorOptions[0].value);
      }
    }
  }, [open, editEvent, initialStart, initialEnd]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startAt || !endAt) return;
    onSubmit({
      title: title.trim(),
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      isAllDay,
      location: location || undefined,
      description: description || undefined,
      color: color || undefined,
    });
    onClose();
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(24px) saturate(1.3)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.3)',
          border: '1px solid var(--glass-border)',
          borderTopColor: 'var(--glass-border-highlight)',
          boxShadow: 'var(--glass-inset), var(--glass-shadow-strong)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {editEvent ? '编辑事件' : '新建事件'}
          </h2>
          <button
            onClick={onClose}
            className="transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="标题">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入事件标题..."
              className="w-full px-3 py-2 rounded-xl text-sm outline-none transition-colors"
              style={inputStyle}
              autoFocus
            />
          </FormField>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allDay"
              checked={isAllDay}
              onChange={(e) => setIsAllDay(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="allDay" className="text-sm" style={{ color: 'var(--text-secondary)' }}>全天事件</label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="开始时间">
              <input
                type={isAllDay ? 'date' : 'datetime-local'}
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none transition-colors"
                style={inputStyle}
              />
            </FormField>
            <FormField label="结束时间">
              <input
                type={isAllDay ? 'date' : 'datetime-local'}
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none transition-colors"
                style={inputStyle}
              />
            </FormField>
          </div>

          <FormField label="地点">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="可选"
              className="w-full px-3 py-2 rounded-xl text-sm outline-none transition-colors"
              style={inputStyle}
            />
          </FormField>

          <FormField label="描述">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="可选"
              rows={3}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none transition-colors resize-none"
              style={inputStyle}
            />
          </FormField>

          {/* 颜色标签 — 预览日历中的 glass 事件样式 */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>颜色标签</label>
            <div className="flex gap-2">
              {colorOptions.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className="flex-1 h-9 rounded-lg flex items-center justify-center text-xs font-medium transition-all duration-150"
                  style={{
                    background: c.bgVar,
                    border: '1px solid var(--glass-border)',
                    color: 'var(--text-primary)',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                    transform: color === c.value ? 'scale(1.05)' : 'scale(1)',
                    boxShadow: color === c.value
                      ? `0 0 0 2px var(--glass-border-highlight), 0 2px 6px rgba(0,0,0,0.1)`
                      : '0 1px 2px rgba(0,0,0,0.05)',
                    opacity: color === c.value ? 1 : 0.7,
                  }}
                  title={c.label}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-secondary)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--glass-bg-hover)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--glass-bg)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
              }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !startAt || !endAt}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{
                background: 'oklch(0.28 0.02 60)',
                boxShadow: '0 1px 0 rgba(255,255,255,0.15) inset',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'oklch(0.32 0.025 60)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'oklch(0.28 0.02 60)';
              }}
            >
              {editEvent ? '保存' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

/** 表单字段包装 */
function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

/** 统一输入框样式 — 自动适配深浅模式 */
const inputStyle: React.CSSProperties = {
  background: 'var(--glass-bg)',
  border: '1px solid var(--glass-border)',
  color: 'var(--text-primary)',
  boxShadow: 'var(--glass-inset)',
};

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultStart(): string {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 1);
  return toDatetimeLocal(now.toISOString());
}

function defaultEnd(): string {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 2);
  return toDatetimeLocal(now.toISOString());
}
