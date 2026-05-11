import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Knowledge from './pages/Knowledge';
import Tools from './pages/Tools';
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
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><Layout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="chat" element={<Chat />} />
        <Route path="knowledge" element={<Knowledge />} />
        <Route path="tools" element={<Tools />} />
        <Route path="prompts" element={<Prompts />} />
        <Route path="evaluation" element={<Evaluation />} />
        <Route path="logs" element={<Logs />} />
      </Route>
    </Routes>
  );
}
