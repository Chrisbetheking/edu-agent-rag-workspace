import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from './shared/AppLayout';
import { ProtectedRoute } from './shared/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ChatPage } from './pages/ChatPage';
import { KnowledgeBasePage } from './pages/KnowledgeBasePage';
import { AgentToolsPage } from './pages/AgentToolsPage';
import { PromptsPage } from './pages/PromptsPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'chat', element: <ChatPage /> },
      { path: 'knowledge-base', element: <KnowledgeBasePage /> },
      { path: 'agent-tools', element: <AgentToolsPage /> },
      { path: 'prompts', element: <PromptsPage /> },
    ],
  },
]);
