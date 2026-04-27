import {
  WelcomeBanner,
  StatOverview,
  TodayTimeline,
  TaskQuickView,
  PomodoroMini,
  WeeklyFocusChart,
  RecentNotes,
  RecentConversations,
  WeatherWidget,
  DailyBriefWidget,
} from '../modules/dashboard';

/**
 * 首页 — 个人科研工作台仪表盘
 *
 * 模块化集成所有核心功能的数据概览：
 * - 欢迎横幅：用户问候 + 快捷操作入口
 * - 统计概览：待办、日程、专注、文献四大关键指标
 * - 今日日程时间线
 * - 待办快览（可勾选完成）
 * - 番茄钟迷你面板 + 本周专注趋势
 * - 最近笔记 + 最近 AI 对话
 */
export default function Home() {
  return (
    <div className="space-y-4">
      {/* 欢迎横幅 */}
      <WelcomeBanner />

      {/* 统计概览 */}
      <StatOverview />

      {/* AI 每日简报 */}
      <DailyBriefWidget />

      {/* 主内容区 — 双栏布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* 左栏（3/5） */}
        <div className="lg:col-span-3 space-y-4">
          <TodayTimeline />
          <TaskQuickView />
        </div>

        {/* 右栏（2/5） */}
        <div className="lg:col-span-2 space-y-4">
          <WeatherWidget />
          <PomodoroMini />
          <WeeklyFocusChart />
          <RecentNotes />
          <RecentConversations />
        </div>
      </div>
    </div>
  );
}
