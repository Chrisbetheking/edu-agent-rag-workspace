import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Knowledge from './pages/Knowledge';
import Tools from './pages/Tools';
import FrontDesk from './pages/FrontDesk';
import Applications from './pages/Applications';
import Architecture from './pages/Architecture';
import Prompts from './pages/Prompts';
import Evaluation from './pages/Evaluation';
import Logs from './pages/Logs';

function Protected({ children }: { children: JSX.Element }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/workspace" element={<Dashboard />} />
        <Route path="frontdesk" element={<FrontDesk />} />
        <Route path="chat" element={<Chat />} />
        <Route path="applications" element={<Applications />} />
        <Route path="knowledge" element={<Knowledge />} />
        <Route path="tools" element={<Tools />} />
        <Route path="prompts" element={<Prompts />} />
        <Route path="evaluation" element={<Evaluation />} />
        <Route path="logs" element={<Logs />} />
        <Route path="architecture" element={<Architecture />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
