import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth';
import Layout from './pages/Layout';
import LoginPage from './pages/LoginPage';

/**
 * 路由级代码分割 — 按页面懒加载，降低首屏 bundle
 */
const Home = lazy(() => import('./pages/Home'));
const CalendarPage = lazy(() => import('./modules/calendar/CalendarPage'));
const TaskPage = lazy(() => import('./modules/task/TaskPage'));
const PomodoroPage = lazy(() => import('./modules/pomodoro/PomodoroPage'));
const NotePage = lazy(() => import('./modules/note/NotePage'));
const ReferencePage = lazy(() => import('./modules/reference/ReferencePage'));
const ReferenceReader = lazy(() => import('./modules/reference/ReferenceReader'));

/**
 * 页面加载占位 — 液态玻璃风格，与 Layout 导航栏视觉一致
 */
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div
        className="w-10 h-10 rounded-full border-2 animate-spin"
        style={{
          borderColor: 'var(--glass-border)',
          borderTopColor: 'oklch(0.52 0.18 260)',
        }}
      />
    </div>
  );
}

/**
 * 路由守卫 — 未登录用户只能访问登录页
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Routes>
      {/* 登录页 — 公开访问（轻量，无需懒加载） */}
      <Route path="/login" element={<LoginPage />} />

      {/* 受保护路由 */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/"
          element={
            <Suspense fallback={<PageLoader />}>
              <Home />
            </Suspense>
          }
        />
        <Route
          path="/calendar"
          element={
            <Suspense fallback={<PageLoader />}>
              <CalendarPage />
            </Suspense>
          }
        />
        <Route
          path="/tasks"
          element={
            <Suspense fallback={<PageLoader />}>
              <TaskPage />
            </Suspense>
          }
        />
        <Route
          path="/pomodoro"
          element={
            <Suspense fallback={<PageLoader />}>
              <PomodoroPage />
            </Suspense>
          }
        />
        <Route
          path="/notes"
          element={
            <Suspense fallback={<PageLoader />}>
              <NotePage />
            </Suspense>
          }
        />
        <Route
          path="/references"
          element={
            <Suspense fallback={<PageLoader />}>
              <ReferencePage />
            </Suspense>
          }
        />
        <Route
          path="/references/:id/read"
          element={
            <Suspense fallback={<PageLoader />}>
              <ReferenceReader />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
