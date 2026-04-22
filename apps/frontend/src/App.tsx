import { Routes, Route } from 'react-router-dom';
import Layout from './pages/Layout';
import Home from './pages/Home';
import CalendarPage from './modules/calendar/CalendarPage';
import TaskPage from './modules/task/TaskPage';
import PomodoroPage from './modules/pomodoro/PomodoroPage';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/tasks" element={<TaskPage />} />
        <Route path="/pomodoro" element={<PomodoroPage />} />
      </Route>
    </Routes>
  );
}

export default App;
