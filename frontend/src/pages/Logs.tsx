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

function StatusBadge({ success }: { success: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '6px 10px',
        borderRadius: 999,
        fontWeight: 900,
        fontSize: 12,
        color: success ? '#166534' : '#991b1b',
        background: success ? '#dcfce7' : '#fee2e2',
      }}
    >
      {success ? '成功' : '失败'}
    </span>
  );
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
      console.error('加载调用日志失败：', err);
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
      successRate: total ? Math.round((successCount / total) * 100) : 0,
      avgDuration,
      avgRag,
    };
  }, [logs]);

  return (
    <section>
      <div className="page-title">
        <div>
          <h1>调用日志</h1>
          <p>从 Supabase call_logs 读取真实 AI 调用记录，用于追踪模型耗时、RAG 命中和工具调用。</p>
        </div>
        <button className="primary" onClick={loadLogs} disabled={loading}>
          {loading ? '刷新中...' : '刷新日志'}
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span>总调用数</span>
          <strong>{stats.total}</strong>
        </div>
        <div className="stat-card">
          <span>成功率</span>
          <strong>{stats.successRate}%</strong>
        </div>
        <div className="stat-card">
          <span>平均耗时</span>
          <strong>{formatDuration(stats.avgDuration)}</strong>
        </div>
        <div className="stat-card">
          <span>平均 RAG 命中</span>
          <strong>{stats.avgRag}</strong>
        </div>
      </div>

      {error && (
        <div className="error-card" style={{ marginBottom: 16 }}>
          <strong>加载失败</strong>
          <p>{error}</p>
        </div>
      )}

      <div className="panel">
        <div className="row-between" style={{ marginBottom: 14 }}>
          <h2 style={{ margin: 0 }}>最近 50 次 AI 调用</h2>
          <span className="muted-text">数据源：Supabase / call_logs</span>
        </div>

        {!loading && logs.length === 0 && (
          <div className="empty-advice" style={{ boxShadow: 'none' }}>
            <div className="empty-icon">LOG</div>
            <h2>暂无调用日志</h2>
            <p>去 AI 对话页生成一次回答后，这里会显示真实调用记录。</p>
          </div>
        )}

        <div className="source-list">
          {logs.map((log) => (
            <div className="source-card" key={log.id}>
              <div className="row-between" style={{ alignItems: 'flex-start' }}>
                <div>
                  <strong style={{ fontSize: 17 }}>{log.question || '未记录问题'}</strong>
                  <small>{formatDate(log.createdAt)}</small>
                </div>
                <StatusBadge success={log.success} />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                  gap: 10,
                  marginTop: 12,
                }}
              >
                <div className="profile-item" style={{ boxShadow: 'none' }}>
                  <span>模型</span>
                  <strong>{log.model || '-'}</strong>
                </div>
                <div className="profile-item" style={{ boxShadow: 'none' }}>
                  <span>耗时</span>
                  <strong>{formatDuration(log.durationMs)}</strong>
                </div>
                <div className="profile-item" style={{ boxShadow: 'none' }}>
                  <span>RAG 命中</span>
                  <strong>{log.ragHitCount || 0}</strong>
                </div>
                <div className="profile-item" style={{ boxShadow: 'none' }}>
                  <span>工具数量</span>
                  <strong>{log.toolNames?.length || 0}</strong>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <span style={{ color: '#64748b', fontWeight: 900, fontSize: 13 }}>工具调用链</span>
                <div className="tag-list" style={{ marginTop: 8 }}>
                  {log.toolNames?.length ? (
                    log.toolNames.map((name) => <span key={name}>{name}</span>)
                  ) : (
                    <span>本次未触发工具</span>
                  )}
                </div>
              </div>

              {log.error && (
                <div className="error-card" style={{ marginTop: 12, boxShadow: 'none' }}>
                  <strong>错误信息</strong>
                  <p>{log.error}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
