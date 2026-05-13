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
  return new Date(value).toLocaleString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' });
}

function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

export default function Logs() {
  const [logs, setLogs] = useState<CallLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [toolFilter, setToolFilter] = useState('all');
  const [sortBy, setSortBy] = useState('time');
  const [keyword, setKeyword] = useState('');

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

  const toolOptions = useMemo(() => {
    const names = new Set<string>();
    logs.forEach((item) => item.toolNames?.forEach((name) => names.add(name)));
    logs.forEach((item) => { if (item.type) names.add(item.type); });
    return Array.from(names).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const now = Date.now();
    const q = keyword.trim().toLowerCase();
    return logs
      .filter((item) => {
        if (statusFilter === 'success' && !item.success) return false;
        if (statusFilter === 'failed' && item.success) return false;
        if (statusFilter === 'slow' && Number(item.durationMs || 0) < 30000) return false;
        const created = new Date(item.createdAt).getTime();
        if (timeFilter === 'today') {
          const day = new Date();
          const start = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
          if (created < start) return false;
        }
        if (timeFilter === '24h' && now - created > 24 * 3600 * 1000) return false;
        if (timeFilter === '7d' && now - created > 7 * 24 * 3600 * 1000) return false;
        if (toolFilter !== 'all' && !(item.toolNames || []).includes(toolFilter) && item.type !== toolFilter) return false;
        if (q) {
          const haystack = [item.question, item.model, item.type, item.error, ...(item.toolNames || [])].join(' ').toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'duration') return Number(b.durationMs || 0) - Number(a.durationMs || 0);
        if (sortBy === 'rag') return Number(b.ragHitCount || 0) - Number(a.ragHitCount || 0);
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [logs, statusFilter, timeFilter, toolFilter, sortBy, keyword]);

  const stats = useMemo(() => {
    const total = filteredLogs.length;
    const successCount = filteredLogs.filter((item) => item.success).length;
    const durations = filteredLogs.map((item) => Number(item.durationMs || 0));
    const avgDuration = total ? Math.round(durations.reduce((sum, item) => sum + item, 0) / total) : 0;
    const avgRag = total ? (filteredLogs.reduce((sum, item) => sum + Number(item.ragHitCount || 0), 0) / total).toFixed(1) : '0';
    const slowCount = filteredLogs.filter((item) => Number(item.durationMs || 0) >= 30000).length;

    return {
      total,
      successCount,
      failedCount: total - successCount,
      successRate: total ? Math.round((successCount / total) * 100) : 0,
      avgDuration,
      p95Duration: percentile(durations, 95),
      slowCount,
      avgRag,
    };
  }, [filteredLogs]);

  return (
    <section className="page-stack logs-page-v18">
      <div className="page-title elevated">
        <div>
          <span className="eyebrow">日志</span>
          <h1>调用日志</h1>
          <p>按状态、耗时、工具和关键词筛选调用记录，用于定位失败、慢请求和 RAG 命中情况。</p>
        </div>
        <button className="primary" onClick={loadLogs} disabled={loading}>{loading ? '刷新中...' : '刷新日志'}</button>
      </div>

      <section className="panel log-filter-panel">
        <div className="filter-grid-v18">
          <label>状态<select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">全部</option><option value="success">成功</option><option value="failed">失败</option><option value="slow">慢请求 ≥ 30s</option></select></label>
          <label>时间<select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}><option value="all">全部</option><option value="today">今天</option><option value="24h">最近 24 小时</option><option value="7d">最近 7 天</option></select></label>
          <label>工具<select value={toolFilter} onChange={(e) => setToolFilter(e.target.value)}><option value="all">全部工具</option>{toolOptions.map((name) => <option value={name} key={name}>{name}</option>)}</select></label>
          <label>排序<select value={sortBy} onChange={(e) => setSortBy(e.target.value)}><option value="time">按时间</option><option value="duration">按耗时</option><option value="rag">按 RAG 命中</option></select></label>
          <label className="filter-search">关键词<input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="问题 / 模型 / 错误 / 工具" /></label>
        </div>
      </section>

      <div className="stats-grid six-stats">
        <div className="stat-card"><span>筛选结果</span><strong>{stats.total}</strong><p>最近 50 条内</p></div>
        <div className="stat-card"><span>成功率</span><strong>{stats.successRate}%</strong><p>{stats.failedCount} 次失败</p></div>
        <div className="stat-card"><span>平均耗时</span><strong>{formatDuration(stats.avgDuration)}</strong><p>模型、检索、工具</p></div>
        <div className="stat-card"><span>P95 耗时</span><strong>{formatDuration(stats.p95Duration)}</strong><p>尾延迟</p></div>
        <div className="stat-card"><span>慢请求</span><strong>{stats.slowCount}</strong><p>≥ 30s</p></div>
        <div className="stat-card"><span>平均 RAG 命中</span><strong>{stats.avgRag}</strong><p>每次命中切片</p></div>
      </div>

      {error && <div className="error-card"><strong>加载失败</strong><p>{error}</p></div>}

      <section className="panel">
        <div className="panel-title compact"><span className="eyebrow">调用列表</span><h2>最近 50 次 AI 调用</h2></div>

        {!loading && filteredLogs.length === 0 && (
          <div className="empty-advice compact-empty">
            <div className="empty-icon">LOG</div>
            <h2>暂无匹配记录</h2>
            <p>换一个筛选条件，或去 AI 咨询页生成一次回答。</p>
          </div>
        )}

        <div className="trace-list trace-list-v18">
          {filteredLogs.map((log) => (
            <article className="trace-card" key={log.id}>
              <div className="trace-head">
                <div>
                  <strong>{log.question || log.error || '未记录问题'}</strong>
                  <span>{formatDate(log.createdAt)} · {log.type || 'AI 调用'}</span>
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
