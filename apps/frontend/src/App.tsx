import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth';
import Layout from './pages/Layout';
import LoginPage from './pages/LoginPage';
import Home from './pages/Home';
import CalendarPage from './modules/calendar/CalendarPage';
import TaskPage from './modules/task/TaskPage';
import PomodoroPage from './modules/pomodoro/PomodoroPage';

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
      {/* 登录页 — 公开访问 */}
      <Route path="/login" element={<LoginPage />} />

      {/* 受保护路由 */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/tasks" element={<TaskPage />} />
        <Route path="/pomodoro" element={<PomodoroPage />} />
      </Route>
    </Routes>
  );
}

export default App;
