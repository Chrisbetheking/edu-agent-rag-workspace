import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth';

const RESUME_URL = 'https://chrisbetheking.github.io/WANGHONG-s-Resume-Website/';

export default function Landing() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function enterGuestDemo() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/guest');
      setAuth(data.token, data.user);
      navigate('/workspace');
    } catch (err: any) {
      setError(err?.response?.data?.message || '访客体验启动失败，请稍后重试。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="public-landing">
      <section className="landing-hero-card">
        <div className="landing-copy">
          <span className="eyebrow">Portfolio Ready AI Product</span>
          <h1>EduAgent 全栈 AI 留学咨询平台</h1>
          <p>
            一个面向 HR / 面试官展示的真实 AI 应用：前台获客、销售跟进、RAG 选校、申请后台、文书生成、Agent 工具链和可观测日志全部串联。
          </p>
          <div className="landing-actions">
            <button className="primary landing-primary" onClick={enterGuestDemo} disabled={loading}>
              {loading ? '正在创建安全演示环境...' : '进入访客体验'}
            </button>
            <a className="ghost-button landing-secondary" href={RESUME_URL} target="_blank" rel="noreferrer">查看简历网站</a>
          </div>
          {error && <div className="error landing-error">{error}</div>}
          <div className="landing-note">
            访客模式会自动分配每日 AI 额度，适合公开作品集演示；管理员入口已隐藏，不再展示任何测试密码。
          </div>
        </div>

        <aside className="landing-product-card">
          <div className="brand mini-brand"><div className="brand-icon">E</div><div><strong>EduAgent</strong><span>AI Agent + RAG Workspace</span></div></div>
          <div className="landing-metric"><span>DeepSeek</span><strong>Real LLM</strong></div>
          <div className="landing-metric"><span>Knowledge Base</span><strong>RAG Sources</strong></div>
          <div className="landing-metric"><span>Workflow</span><strong>Growth → Sales → Apply</strong></div>
          <div className="landing-metric"><span>Export</span><strong>Markdown / JSON</strong></div>
        </aside>
      </section>

      <section className="landing-feature-grid">
        <article><span>01</span><h3>前台增长</h3><p>输入学生画像，生成小红书笔记、短视频脚本、微信私域跟进内容。</p></article>
        <article><span>02</span><h3>AI 选校 + RAG</h3><p>基于知识库命中和工具调用，输出冲刺、匹配、保底三档方案。</p></article>
        <article><span>03</span><h3>申请后台</h3><p>生成 PS 初稿、CV 摘要、推荐信素材、材料清单和递交流程。</p></article>
        <article><span>04</span><h3>Agent 工具链</h3><p>把成绩判断、选校、销售、文书和材料流程串成完整业务闭环。</p></article>
      </section>

      <div className="owner-entry">
        <Link to="/login">Owner Console</Link>
      </div>
    </main>
  );
}
