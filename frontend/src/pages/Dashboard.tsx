import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';

type DocumentItem = { id: string; title: string; fileName?: string; status?: string; chunkCount?: number; createdAt?: string };
type LogItem = { id: string; question?: string; model?: string; success?: boolean; durationMs?: number; ragHitCount?: number; toolNames?: string[]; createdAt?: string };
type ToolOverview = { totalCalls?: number; successRate?: number; avgDurationMs?: number; avgRagHitCount?: number; latestLogs?: LogItem[]; toolUsage?: Array<{ name: string; count: number }> };
type DocumentStats = { totalDocuments?: number; totalChunks?: number; parsedDocuments?: number; recentDocuments?: DocumentItem[] };

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
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [docsRes, statsRes, overviewRes] = await Promise.allSettled([
        api.get('/documents'),
        api.get('/documents/stats'),
        api.get('/tools/overview?limit=80'),
      ]);
      if (docsRes.status === 'fulfilled') setDocuments(Array.isArray(docsRes.value.data) ? docsRes.value.data : []);
      if (statsRes.status === 'fulfilled') setDocStats(statsRes.value.data);
      if (overviewRes.status === 'fulfilled') {
        setOverview(overviewRes.value.data);
        setLogs(Array.isArray(overviewRes.value.data?.latestLogs) ? overviewRes.value.data.latestLogs : []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load().catch(() => setLoading(false)); }, []);

  const metrics = useMemo(() => {
    const totalDocs = docStats?.totalDocuments ?? documents.length;
    const totalChunks = docStats?.totalChunks ?? documents.reduce((sum, doc) => sum + Number(doc.chunkCount || 0), 0);
    const totalCalls = overview?.totalCalls ?? logs.length;
    const successRate = overview?.successRate != null ? Math.round(overview.successRate * 100) : 0;
    return { totalDocs, totalChunks, totalCalls, successRate, avgDuration: overview?.avgDurationMs ?? 0, avgRag: overview?.avgRagHitCount ?? 0 };
  }, [docStats, documents, logs, overview]);

  const recentDocs = docStats?.recentDocuments?.length ? docStats.recentDocuments : documents.slice(0, 5);
  const latestLogs = overview?.latestLogs?.length ? overview.latestLogs : logs.slice(0, 5);

  return (
    <section className="page-stack compact-page">
      <div className="page-title elevated clean-title">
        <div>
          <span className="eyebrow">系统概览</span>
          <h1>EduAgent 工作台</h1>
          <p>客户线索、知识库检索、选校建议、申请案卷和调用日志，都放在这一套流程里看。</p>
        </div>
        <button className="ghost-button" onClick={load} disabled={loading}>{loading ? '刷新中...' : '刷新'}</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card accent"><span>文档</span><strong>{metrics.totalDocs}</strong><p>{docStats?.parsedDocuments ?? metrics.totalDocs} 个已解析</p></div>
        <div className="stat-card"><span>切片</span><strong>{metrics.totalChunks}</strong><p>可用于检索</p></div>
        <div className="stat-card"><span>调用</span><strong>{metrics.totalCalls}</strong><p>平均 {formatDuration(metrics.avgDuration)}</p></div>
        <div className="stat-card"><span>成功率</span><strong>{metrics.successRate}%</strong><p>平均命中 {metrics.avgRag}</p></div>
      </div>

      <div className="product-grid compact-products">
        <article className="product-card highlight-card">
          <span>业务流程</span>
          <h2>学生背景 → 检索 → 评分 → 方案</h2>
          <p>先把学生信息结构化，再结合知识库和规则评分，最后生成选校、文书和跟进内容。</p>
          <div className="flow-line"><em>录入</em><em>检索</em><em>评分</em><em>生成</em><em>导出</em></div>
        </article>
        <article className="product-card">
          <span>算法模块</span>
          <h2>申请适配评分</h2>
          <p>按 GPA、专业匹配、项目经历、语言成绩和预算风险给出可解释评分，辅助分层选校。</p>
        </article>
        <article className="product-card">
          <span>工程能力</span>
          <h2>可追踪的后端调用</h2>
          <p>每次 AI 请求的耗时、命中和工具调用都会留下记录，方便定位哪里慢、哪里失败。</p>
        </article>
      </div>

      <div className="two-col wide-left compact-dashboard-grid">
        <section className="panel">
          <div className="panel-title"><div><span className="eyebrow">最近资料</span><h2>知识库</h2></div></div>
          {recentDocs.length === 0 ? <div className="empty-mini">还没有文档，先去知识库导入资料。</div> : recentDocs.map((doc) => (
            <div className="list-row rich" key={doc.id}>
              <div><strong>{doc.title}</strong><span>{doc.fileName || '文本'} · {doc.status || 'parsed'} · {formatDate(doc.createdAt)}</span></div>
              <em>{doc.chunkCount || 0} 片</em>
            </div>
          ))}
        </section>

        <section className="panel">
          <div className="panel-title compact"><span className="eyebrow">调用轨迹</span><h2>最近请求</h2></div>
          {latestLogs.length === 0 ? <div className="empty-mini">暂无调用记录。</div> : latestLogs.map((log) => (
            <div className="call-row" key={log.id}>
              <div><strong>{log.question || log.toolNames?.[0] || '工具调用'}</strong><span>{log.model || 'local-tool'} · {formatDate(log.createdAt)}</span></div>
              <div className="call-meta"><b>{formatDuration(log.durationMs)}</b><small className={log.success === false ? 'pill danger' : 'pill success'}>{log.success === false ? '失败' : '成功'}</small></div>
            </div>
          ))}
        </section>
      </div>

      <section className="panel compact-section">
        <div className="panel-title compact"><span className="eyebrow">工具使用</span><h2>触发分布</h2></div>
        <div className="usage-grid">
          {(overview?.toolUsage?.length ? overview.toolUsage : [{ name: '暂无调用', count: 0 }]).slice(0, 6).map((tool) => (
            <div className="usage-card" key={tool.name}>
              <strong>{tool.name}</strong><span>{tool.count} 次</span><div className="usage-bar"><i style={{ width: `${Math.min(100, Math.max(8, tool.count * 18))}%` }} /></div>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
