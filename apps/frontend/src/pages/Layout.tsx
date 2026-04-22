import { Outlet, Link, useLocation } from 'react-router-dom';
import { useThemeStore } from '../stores/theme';
import { Calendar, CheckSquare, Timer, Home, Moon, Sun } from 'lucide-react';

const navItems = [
  { path: '/', label: '首页', icon: Home },
  { path: '/calendar', label: '日程', icon: Calendar },
  { path: '/tasks', label: '待办', icon: CheckSquare },
  { path: '/pomodoro', label: '番茄钟', icon: Timer },
];

export default function Layout() {
  const location = useLocation();
  const { isDark, toggle } = useThemeStore();

  return (
    <div className="min-h-screen">
      {/* 导航栏 — 液态玻璃 */}
      <nav
        className="sticky top-0 z-50 border-b"
        style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(24px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
          borderColor: 'var(--glass-border)',
          boxShadow: 'var(--glass-shadow)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold text-lg tracking-tight">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm text-white"
              style={{ background: 'linear-gradient(135deg, oklch(0.52 0.18 260), oklch(0.6 0.12 290))' }}
            >
              ◈
            </div>
            PhD Workstation
          </Link>

          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  style={isActive ? { background: 'var(--glass-bg-hover)' } : {}}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <button
            onClick={toggle}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            style={{
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              backdropFilter: 'blur(8px)',
            }}
            aria-label="切换主题"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </nav>

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
