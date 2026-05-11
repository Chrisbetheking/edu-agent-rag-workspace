import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';

type DocumentItem = {
  id: string;
  title: string;
  fileName?: string;
  status?: string;
  chunkCount?: number;
  createdAt?: string;
};

type LogItem = {
  id: string;
  question?: string;
  model?: string;
  success?: boolean;
  durationMs?: number;
  ragHitCount?: number;
  toolNames?: string[];
  createdAt?: string;
};

type ToolOverview = {
  totalCalls?: number;
  successRate?: number;
  avgDurationMs?: number;
  avgRagHitCount?: number;
  latestLogs?: LogItem[];
  toolUsage?: Array<{ name: string; count: number }>;
};

type DocumentStats = {
  totalDocuments?: number;
  totalChunks?: number;
  parsedDocuments?: number;
  recentDocuments?: DocumentItem[];
};

function formatDuration(ms?: number) {
  const value = Number(ms || 0);
  if (value >= 1000) return `${(value / 1000).toFixed(1)}s`;
  return `${value}ms`;
}

function formatDate(value?: string) {
  if (!value) return '刚刚';
  return new Date(value).toLocaleString();
}

export default function Dashboard() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [overview, setOverview] = useState<ToolOverview | null>(null);
  const [docStats, setDocStats] = useState<DocumentStats | null>(null);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [docsRes, statsRes, overviewRes, healthRes] = await Promise.allSettled([
        api.get('/documents'),
        api.get('/documents/stats'),
        api.get('/tools/overview?limit=80'),
        api.get('/health'),
      ]);

      if (docsRes.status === 'fulfilled') setDocuments(Array.isArray(docsRes.value.data) ? docsRes.value.data : []);
      if (statsRes.status === 'fulfilled') setDocStats(statsRes.value.data);
      if (overviewRes.status === 'fulfilled') {
        setOverview(overviewRes.value.data);
        setLogs(Array.isArray(overviewRes.value.data?.latestLogs) ? overviewRes.value.data.latestLogs : []);
      } else {
        const fallbackLogs = await api.get('/tools/logs?limit=8');
        setLogs(Array.isArray(fallbackLogs.data) ? fallbackLogs.data : []);
      }
      if (healthRes.status === 'fulfilled') setHealth(healthRes.value.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

  const metrics = useMemo(() => {
    const totalDocs = docStats?.totalDocuments ?? documents.length;
    const totalChunks = docStats?.totalChunks ?? documents.reduce((sum, doc) => sum + Number(doc.chunkCount || 0), 0);
    const totalCalls = overview?.totalCalls ?? logs.length;
    const successRate = overview?.successRate != null
      ? Math.round(overview.successRate * 100)
      : logs.length
        ? Math.round((logs.filter((log) => log.success).length / logs.length) * 100)
        : 0;

    return {
      totalDocs,
      totalChunks,
      totalCalls,
      successRate,
      avgDuration: overview?.avgDurationMs ?? 0,
      avgRag: overview?.avgRagHitCount ?? 0,
    };
  }, [docStats, documents, logs, overview]);

  const recentDocs = docStats?.recentDocuments?.length ? docStats.recentDocuments : documents.slice(0, 6);
  const latestLogs = overview?.latestLogs?.length ? overview.latestLogs : logs.slice(0, 6);

  return (
    <section className="page-stack">
      <div className="dashboard-hero">
        <div>
          <span className="section-kicker">Portfolio Ready AI Workspace</span>
          <h1>EduAgent 全栈 AI 留学咨询平台</h1>
          <p>一套可以展示给 HR / 面试官的真实产品：前端工作台、NestJS 后端、Supabase 持久化、RAG 检索、Agent 工具和可观测性闭环。</p>
        </div>
        <div className="hero-health-card">
          <span className="status-dot">{health?.status || 'ok'}</span>
          <strong>{health?.demoMode ? 'Demo Safe Mode' : 'Real LLM Mode'}</strong>
          <small>{loading ? '同步系统状态中' : '系统服务在线'}</small>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card accent"><span>知识库文档</span><strong>{metrics.totalDocs}</strong><p>{docStats?.parsedDocuments ?? metrics.totalDocs} 个已解析</p></div>
        <div className="stat-card"><span>RAG Chunks</span><strong>{metrics.totalChunks}</strong><p>用于检索增强生成</p></div>
        <div className="stat-card"><span>AI 调用</span><strong>{metrics.totalCalls}</strong><p>平均耗时 {formatDuration(metrics.avgDuration)}</p></div>
        <div className="stat-card"><span>成功率</span><strong>{metrics.successRate}%</strong><p>平均 RAG 命中 {metrics.avgRag}</p></div>
      </div>

      <div className="product-grid">
        <article className="product-card highlight-card">
          <span>Core Flow</span>
          <h2>从学生背景到结构化选校方案</h2>
          <p>用户输入背景后，系统先检索知识库，再触发业务工具，最后让 LLM 输出可展示的冲刺 / 匹配 / 保底方案。</p>
          <div className="flow-line">
            <em>Input</em><em>RAG</em><em>Tools</em><em>LLM</em><em>Cards</em>
          </div>
        </article>
        <article className="product-card">
          <span>Engineering</span>
          <h2>后端可观测性</h2>
          <p>每次 AI 调用都会记录模型、耗时、成功状态、RAG 命中数量和工具链，方便排查质量与成本问题。</p>
        </article>
        <article className="product-card">
          <span>Quality</span>
          <h2>RAG 评测意识</h2>
          <p>内置评测题、Expected Source、Recall@K 和 Bad Case 分析入口，体现不是只会调 API，而是会做 AI 产品质量管理。</p>
        </article>
      </div>

      <div className="two-col wide-left">
        <section className="panel">
          <div className="panel-title">
            <div><span className="eyebrow">Knowledge Base</span><h2>最近文档</h2></div>
            <button className="ghost-button" onClick={load}>刷新</button>
          </div>
          {recentDocs.length === 0 ? (
            <div className="empty-mini">暂无知识库文档，去知识库页添加第一条资料。</div>
          ) : recentDocs.map((doc) => (
            <div className="list-row rich" key={doc.id}>
              <div>
                <strong>{doc.title}</strong>
                <span>{doc.fileName || 'text upload'} · {doc.status || 'parsed'} · {formatDate(doc.createdAt)}</span>
              </div>
              <em>{doc.chunkCount || 0} chunks</em>
            </div>
          ))}
        </section>

        <section className="panel">
          <div className="panel-title compact"><span className="eyebrow">Latest Calls</span><h2>实时调用轨迹</h2></div>
          {latestLogs.length === 0 ? (
            <div className="empty-mini">暂无调用记录。先去 AI 对话页生成一次方案。</div>
          ) : latestLogs.map((log) => (
            <div className="call-row" key={log.id}>
              <div>
                <strong>{log.question || log.toolNames?.[0] || '工具调用'}</strong>
                <span>{log.model || 'local-tool'} · {formatDate(log.createdAt)}</span>
              </div>
              <div className="call-meta">
                <b>{formatDuration(log.durationMs)}</b>
                <small className={log.success === false ? 'pill danger' : 'pill success'}>{log.success === false ? 'failed' : 'success'}</small>
              </div>
            </div>
          ))}
        </section>
      </div>

      <section className="panel">
        <div className="panel-title compact"><span className="eyebrow">Tool Usage</span><h2>Agent 工具触发分布</h2></div>
        <div className="usage-grid">
          {(overview?.toolUsage?.length ? overview.toolUsage : [{ name: '等待真实调用', count: 0 }]).map((tool) => (
            <div className="usage-card" key={tool.name}>
              <strong>{tool.name}</strong>
              <span>{tool.count} 次</span>
              <div className="usage-bar"><i style={{ width: `${Math.min(100, Math.max(8, tool.count * 18))}%` }} /></div>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
