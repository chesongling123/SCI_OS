import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Timer } from 'lucide-react';
import { useAuthStore } from '../../../stores/auth';

/**
 * 根据当前时间返回问候语
 */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return '早安';
  if (hour < 18) return '下午好';
  return '晚上好';
}

/**
 * 格式化完整中文日期
 */
function formatFullDate(date: Date): string {
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}年${month}月${day}日 ${weekdays[date.getDay()]}`;
}

export function WelcomeBanner() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const greeting = useMemo(() => getGreeting(), []);
  const todayStr = useMemo(() => formatFullDate(new Date()), []);

  const name = user?.name || user?.email?.split('@')[0] || '研究员';

  return (
    <div
      className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 rounded-xl"
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px) saturate(1.3)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
        border: '1px solid var(--glass-border)',
        borderTopColor: 'var(--glass-border-highlight)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), var(--glass-shadow)',
      }}
    >
      <div>
        <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          {greeting}，{name}
        </h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {todayStr}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <ShortcutButton
          icon={<FileText className="w-4 h-4" />}
          label="新建笔记"
          onClick={() => navigate('/notes', { state: { createNew: true } })}
        />
        <ShortcutButton
          icon={<Plus className="w-4 h-4" />}
          label="新建任务"
          onClick={() => navigate('/tasks', { state: { createNew: true } })}
        />
        <ShortcutButton
          icon={<Timer className="w-4 h-4" />}
          label="快速专注"
          onClick={() => navigate('/pomodoro')}
        />
      </div>
    </div>
  );
}

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
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 hover:-translate-y-0.5"
      style={{
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        color: 'var(--text-secondary)',
        backdropFilter: 'blur(8px)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
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
      {icon}
      {label}
    </button>
  );
}
