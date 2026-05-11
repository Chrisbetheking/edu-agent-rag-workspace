import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

const navs = [
  ['/', '工作台'],
  ['/chat', 'AI 对话'],
  ['/knowledge', '知识库'],
  ['/tools', 'Agent 工具'],
  ['/prompts', 'Prompt 管理'],
  ['/evaluation', 'RAG 评测'],
  ['/logs', '调用日志'],
];

export default function Layout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">E</div>
          <div>
            <strong>EduAgent</strong>
            <span>AI 留学咨询工作台</span>
          </div>
        </div>
        <nav>
          {navs.map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'nav active' : 'nav'} end={to === '/'}>{label}</NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span>{user?.displayName || '用户'}</span>
          <button onClick={() => { logout(); navigate('/login'); }}>退出</button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
