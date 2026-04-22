import { Link } from 'react-router-dom';
import { Calendar, CheckSquare, Timer, ArrowRight } from 'lucide-react';

const features = [
  {
    icon: Calendar,
    title: '智能日程',
    desc: '周/日/月多视图，支持重复事件与外部日历同步',
    path: '/calendar',
  },
  {
    icon: CheckSquare,
    title: 'GTD 待办',
    desc: '项目-任务-子任务三级结构，拖拽排序',
    path: '/tasks',
  },
  {
    icon: Timer,
    title: '番茄钟',
    desc: '专注计时 + 行为数据收集，生成 52 周热力图',
    path: '/pomodoro',
  },
];

export default function Home() {
  return (
    <div className="space-y-12">
      {/* Hero 区域 */}
      <section className="text-center pt-8 pb-4">
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium mb-6"
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border)',
            color: 'oklch(0.52 0.18 260)',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          本地优先 · AI 原生 · 数据主权
        </div>

        <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-4">
          为深度知识工作者
          <br />
          打造的 <em className="font-serif italic text-primary">AI 驱动</em> 科研工作台
        </h1>

        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
          统一文献管理、日程规划、实验记录与论文写作。你的数据留在本地，AI 能力触手可及。
        </p>

        <div className="flex gap-3 justify-center">
          <Link
            to="/calendar"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
            style={{
              background: 'oklch(0.52 0.18 260)',
              boxShadow: '0 4px 16px oklch(0.52 0.18 260 / 0.15), inset 0 1px 0 rgba(255,255,255,0.2)',
            }}
          >
            开始使用
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5"
            style={{
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(12px)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-primary)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), var(--glass-shadow)',
            }}
          >
            GitHub 源码
          </a>
        </div>
      </section>

      {/* 功能卡片 */}
      <section>
        <div className="text-center mb-8">
          <h2 className="text-xl font-semibold mb-1">Phase 1 核心模块</h2>
          <p className="text-muted-foreground text-sm">当前开发中的基础功能</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <Link
                key={f.path}
                to={f.path}
                className="group p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01]"
                style={{
                  background: 'var(--glass-bg)',
                  backdropFilter: 'blur(20px) saturate(1.3)',
                  WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
                  border: '1px solid var(--glass-border)',
                  borderTopColor: 'var(--glass-border-highlight)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), var(--glass-shadow)',
                }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-lg mb-4"
                  style={{
                    background: 'oklch(0.52 0.18 260 / 0.15)',
                    border: '1px solid var(--glass-border)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
                  }}
                >
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
