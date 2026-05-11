import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';

interface CallLogItem {
  id: string;
  type?: string;
  conversationId?: string;
  question: string;
  model: string;
  success: boolean;
  status: string;
  durationMs: number;
  ragHitCount: number;
  toolNames: string[];
  error?: string;
  createdAt: string;
}

function formatDuration(ms?: number) {
  const value = Number(ms || 0);
  if (value >= 1000) return `${(value / 1000).toFixed(1)}s`;
  return `${value}ms`;
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

export default function Logs() {
  const [logs, setLogs] = useState<CallLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadLogs() {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.get('/tools/logs?limit=50');
      setLogs(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || '加载调用日志失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  const stats = useMemo(() => {
    const total = logs.length;
    const successCount = logs.filter((item) => item.success).length;
    const avgDuration = total
      ? Math.round(logs.reduce((sum, item) => sum + Number(item.durationMs || 0), 0) / total)
      : 0;
    const avgRag = total
      ? (logs.reduce((sum, item) => sum + Number(item.ragHitCount || 0), 0) / total).toFixed(1)
      : '0';

    return {
      total,
      successCount,
      failedCount: total - successCount,
      successRate: total ? Math.round((successCount / total) * 100) : 0,
      avgDuration,
      avgRag,
    };
  }, [logs]);

  return (
    <section className="page-stack">
      <div className="page-title elevated">
        <div>
          <span className="eyebrow">Observability</span>
          <h1>调用日志</h1>
          <p>从 call_logs 读取真实调用记录，用于追踪模型耗时、RAG 命中、工具调用链和错误信息。</p>
        </div>
        <button className="primary" onClick={loadLogs} disabled={loading}>{loading ? '刷新中...' : '刷新日志'}</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><span>总调用数</span><strong>{stats.total}</strong><p>最近 50 条</p></div>
        <div className="stat-card"><span>成功率</span><strong>{stats.successRate}%</strong><p>{stats.failedCount} 次失败</p></div>
        <div className="stat-card"><span>平均耗时</span><strong>{formatDuration(stats.avgDuration)}</strong><p>LLM + RAG + tools</p></div>
        <div className="stat-card"><span>平均 RAG 命中</span><strong>{stats.avgRag}</strong><p>chunks per call</p></div>
      </div>

      {error && <div className="error-card"><strong>加载失败</strong><p>{error}</p></div>}

      <section className="panel">
        <div className="panel-title compact"><span className="eyebrow">Trace List</span><h2>最近 50 次 AI 调用</h2></div>

        {!loading && logs.length === 0 && (
          <div className="empty-advice compact-empty">
            <div className="empty-icon">LOG</div>
            <h2>暂无调用日志</h2>
            <p>去 AI 对话页生成一次回答后，这里会显示真实调用记录。</p>
          </div>
        )}

        <div className="trace-list">
          {logs.map((log) => (
            <article className="trace-card" key={log.id}>
              <div className="trace-head">
                <div>
                  <strong>{log.question || '未记录问题'}</strong>
                  <span>{formatDate(log.createdAt)} · {log.type || 'ai_call'}</span>
                </div>
                <small className={log.success ? 'pill success' : 'pill danger'}>{log.success ? '成功' : '失败'}</small>
              </div>

              <div className="trace-metrics">
                <div><span>模型</span><strong>{log.model || '-'}</strong></div>
                <div><span>耗时</span><strong>{formatDuration(log.durationMs)}</strong></div>
                <div><span>RAG 命中</span><strong>{log.ragHitCount || 0}</strong></div>
                <div><span>工具数量</span><strong>{log.toolNames?.length || 0}</strong></div>
              </div>

              <div className="tag-row">
                {log.toolNames?.length ? log.toolNames.map((name) => <span key={name}>{name}</span>) : <span>本次未触发工具</span>}
              </div>

              {log.error && <div className="error-card slim"><strong>错误信息</strong><p>{log.error}</p></div>}
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
