import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { api, describeDeployment, type DeploymentInfo } from '../api/client';

const navs = [
  { to: '/workspace', label: '工作台', icon: '▦', desc: '概览' },
  { to: '/frontdesk', label: '客户线索', icon: '✍', desc: '内容与跟进' },
  { to: '/chat', label: 'AI 咨询', icon: '✦', desc: '选校问答' },
  { to: '/applications', label: '申请案卷', icon: '▣', desc: '文书与材料' },
  { to: '/knowledge', label: '知识库', icon: '▤', desc: '资料切片' },
  { to: '/tools', label: '方案引擎', icon: '⌘', desc: '评分与编排' },
  { to: '/evaluation', label: '检索评测', icon: '◎', desc: '命中验证' },
  { to: '/logs', label: '系统日志', icon: '◌', desc: '调用追踪' },
];

function pageLabel(pathname: string) {
  const current = navs.find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));
  return current?.label || 'EduAgent';
}

function defaultCollapsed() {
  if (typeof window === 'undefined') return false;
  const stored = window.localStorage.getItem('eduagent-sidebar-collapsed');
  if (stored) return stored === 'true';
  return window.innerWidth < 900;
}

export default function Layout() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const isGuest = user?.role === 'guest';
  const resumeUrl = 'https://chrisbetheking.github.io/WANGHONG-s-Resume-Website/';
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [deployment, setDeployment] = useState<DeploymentInfo | null>(null);

  useEffect(() => {
    api.get('/auth/profile')
      .then(({ data }) => setUser(data))
      .catch(() => undefined);
  }, [location.pathname, setUser]);

  useEffect(() => {
    let alive = true;
    api.get('/health')
      .then(({ data }) => { if (alive) setDeployment(data?.deployment || null); })
      .catch(() => { if (alive) setDeployment({ mode: 'demo_fallback', backend: 'EdgeOne Demo Fallback', proxy: 'EdgeOne Pages Functions', fallback: true, reason: 'health_check_failed' }); });
    return () => { alive = false; };
  }, []);

  function toggleSidebar() {
    setCollapsed((value) => {
      const next = !value;
      window.localStorage.setItem('eduagent-sidebar-collapsed', String(next));
      return next;
    });
  }

  return (
    <div className={collapsed ? 'app-shell sidebar-collapsed' : 'app-shell'}>
      <aside className="sidebar">
        <div className="sidebar-head">
          <div className="brand">
            <div className="brand-icon">E</div>
            <div className="sidebar-text">
              <strong>EduAgent</strong>
              <span>留学咨询工作台</span>
            </div>
          </div>
          <button className="sidebar-toggle-inline" type="button" onClick={toggleSidebar} aria-label="切换侧边栏">
            {collapsed ? '展开' : '收起'}
          </button>
        </div>

        <div className="sidebar-status">
          <span className="pulse-dot" />
          <div className="sidebar-text">
            <strong>{deployment?.mode === 'demo_fallback' ? '备用入口' : (isGuest ? '访客体验' : '管理员')}</strong>
            <small>{deployment ? describeDeployment(deployment) : (isGuest ? `今日剩余 ${user?.quotaRemaining ?? '-'} / ${user?.quotaLimit ?? '-'}` : '后端服务在线')}</small>
          </div>
        </div>

        <nav className="nav-list">
          {navs.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={item.label}
              className={({ isActive }) => (isActive ? 'nav active' : 'nav')}
              end={item.to === '/workspace'}
              onClick={() => { if (window.innerWidth < 900) setCollapsed(true); }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="sidebar-text">
                <strong>{item.label}</strong>
                <small>{item.desc}</small>
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {isGuest && <a className="sidebar-resume" href={resumeUrl} target="_blank" rel="noreferrer"><span className="sidebar-text">查看我的 Resume Web</span><span className="nav-icon resume-icon">↗</span></a>}
          <div className="user-card">
            <div className="avatar">{(user?.displayName || user?.username || 'U').slice(0, 1).toUpperCase()}</div>
            <div className="sidebar-text">
              <strong>{user?.displayName || '用户'}</strong>
              <small>{isGuest ? '访客 · 部分操作受限' : `${user?.role || 'admin'} · ${pageLabel(location.pathname)}`}</small>
            </div>
          </div>
          <button className="ghost-dark sidebar-text" onClick={() => { logout(); navigate('/login'); }}>退出</button>
        </div>
      </aside>

      <button className="mobile-sidebar-open" type="button" onClick={toggleSidebar}>{collapsed ? '菜单' : '收起'}</button>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
