import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuthStore } from '../stores/auth';

/**
 * 登录/注册页面
 * 液态玻璃风格，支持登录和注册模式切换
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isRegister ? '/api/v1/auth/register' : '/api/v1/auth/login';
      const body = isRegister
        ? JSON.stringify({ email, password, name: name || undefined })
        : JSON.stringify({ email, password });

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || (isRegister ? '注册失败' : '登录失败'));
      }

      setAuth(data.accessToken, data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message || '网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      {/* 背景装饰 */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse at 30% 50%, var(--bg-gradient-2) 0%, transparent 50%),' +
            'radial-gradient(ellipse at 70% 30%, var(--bg-gradient-3) 0%, transparent 40%),' +
            'var(--bg-primary)',
          backgroundAttachment: 'fixed',
        }}
      />

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-xl text-white mb-3 shadow-lg"
            style={{ background: 'linear-gradient(135deg, oklch(0.52 0.18 260), oklch(0.6 0.12 290))' }}
          >
            <BookOpen className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            科研生活助手
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            科研效率工作站
          </p>
        </div>

        {/* 表单卡片 */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(20px) saturate(1.2)',
            WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
            border: '1px solid var(--glass-border)',
            borderTopColor: 'var(--glass-border-highlight)',
            boxShadow: 'var(--glass-inset), var(--glass-shadow-strong)',
          }}
        >
          <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            {isRegister ? '创建账号' : '欢迎回来'}
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: 'oklch(0.55 0.15 25 / 0.1)', color: '#dc2626' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isRegister && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>昵称</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="可选"
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none transition-colors"
                  style={inputStyle}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full px-3 py-2 rounded-xl text-sm outline-none transition-colors"
                style={inputStyle}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>密码</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full px-3 py-2 pr-10 rounded-xl text-sm outline-none transition-colors"
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              style={{
                background: 'oklch(0.28 0.02 60)',
                boxShadow: '0 1px 0 rgba(255,255,255,0.15) inset',
              }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isRegister ? '注册' : '登录'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => { setIsRegister(!isRegister); setError(''); }}
              className="text-xs transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              {isRegister ? '已有账号？去登录' : '还没有账号？去注册'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'var(--glass-bg)',
  border: '1px solid var(--glass-border)',
  color: 'var(--text-primary)',
  boxShadow: 'var(--glass-inset)',
};
