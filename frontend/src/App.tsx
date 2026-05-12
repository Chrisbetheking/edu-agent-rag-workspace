import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Knowledge from './pages/Knowledge';
import Tools from './pages/Tools';
import FrontDesk from './pages/FrontDesk';
import Applications from './pages/Applications';
import Evaluation from './pages/Evaluation';
import Logs from './pages/Logs';

function Entry() {
  const token = useAuthStore((s) => s.token);
  return <Navigate to={token ? '/workspace' : '/login'} replace />;
}

function Protected({ children }: { children: JSX.Element }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Entry />} />
      <Route path="/login" element={<Login />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/workspace" element={<Dashboard />} />
        <Route path="frontdesk" element={<FrontDesk />} />
        <Route path="chat" element={<Chat />} />
        <Route path="applications" element={<Applications />} />
        <Route path="knowledge" element={<Knowledge />} />
        <Route path="tools" element={<Tools />} />
        <Route path="evaluation" element={<Evaluation />} />
        <Route path="logs" element={<Logs />} />
        <Route path="prompts" element={<Navigate to="/tools" replace />} />
        <Route path="architecture" element={<Navigate to="/workspace" replace />} />
      </Route>
      <Route path="*" element={<Entry />} />
    </Routes>
  );
}
