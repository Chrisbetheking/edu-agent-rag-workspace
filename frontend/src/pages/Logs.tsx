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

type StatusFilter = 'all' | 'success' | 'failed' | 'slow';
type TimeFilter = 'all' | 'today' | '24h' | '7d';

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
  return sorted[index] || 0;
}

function isWithinTime(log: CallLogItem, filter: TimeFilter) {
  if (filter === 'all') return true;
  const created = new Date(log.createdAt).getTime();
  if (!created) return false;
  const now = Date.now();
  if (filter === '24h') return now - created <= 24 * 60 * 60 * 1000;
  if (filter === '7d') return now - created <= 7 * 24 * 60 * 60 * 1000;
  const d = new Date(log.createdAt);
  const local = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
  return local.getFullYear() === today.getFullYear() && local.getMonth() === today.getMonth() && local.getDate() === today.getDate();
}

export default function Logs() {
  const [logs, setLogs] = useState<CallLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [toolFilter, setToolFilter] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [sortBy, setSortBy] = useState<'time' | 'duration' | 'rag'>('time');

  async function loadLogs() {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.get('/tools/logs?limit=100');
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
    logs.forEach((log) => (log.toolNames || []).forEach((name) => names.add(name)));
    return Array.from(names).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return logs
      .filter((log) => {
        if (!isWithinTime(log, timeFilter)) return false;
        if (statusFilter === 'success' && !log.success) return false;
        if (statusFilter === 'failed' && log.success) return false;
        if (statusFilter === 'slow' && Number(log.durationMs || 0) < 30000) return false;
        if (toolFilter !== 'all' && !(log.toolNames || []).includes(toolFilter)) return false;
        if (!q) return true;
        return [log.question, log.model, log.type, log.status, log.error, ...(log.toolNames || [])]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q));
      })
      .sort((a, b) => {
        if (sortBy === 'duration') return Number(b.durationMs || 0) - Number(a.durationMs || 0);
        if (sortBy === 'rag') return Number(b.ragHitCount || 0) - Number(a.ragHitCount || 0);
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [logs, statusFilter, timeFilter, toolFilter, keyword, sortBy]);

  const stats = useMemo(() => {
    const total = filteredLogs.length;
    const successCount = filteredLogs.filter((item) => item.success).length;
    const durations = filteredLogs.map((item) => Number(item.durationMs || 0)).filter(Boolean);
    const avgDuration = total
      ? Math.round(filteredLogs.reduce((sum, item) => sum + Number(item.durationMs || 0), 0) / total)
      : 0;
    const avgRag = total
      ? (filteredLogs.reduce((sum, item) => sum + Number(item.ragHitCount || 0), 0) / total).toFixed(1)
      : '0';

    return {
      total,
      successCount,
      failedCount: total - successCount,
      successRate: total ? Math.round((successCount / total) * 100) : 0,
      avgDuration,
      p95Duration: percentile(durations, 95),
      slowCount: filteredLogs.filter((item) => Number(item.durationMs || 0) >= 30000).length,
      avgRag,
    };
  }, [filteredLogs]);

  return (
    <section className="page-stack logs-page-v12">
      <div className="page-title elevated">
        <div>
          <span className="eyebrow">日志</span>
          <h1>调用日志</h1>
          <p>用于排查失败、慢请求、RAG 命中和工具调用链。这里是后端可观测性入口。</p>
        </div>
        <button className="primary" onClick={loadLogs} disabled={loading}>{loading ? '刷新中...' : '刷新日志'}</button>
      </div>

      <section className="panel logs-filter-panel">
        <div className="panel-title compact"><span className="eyebrow">筛选</span><h2>调用筛选</h2></div>
        <div className="log-filter-grid">
          <label>状态<select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}><option value="all">全部</option><option value="success">成功</option><option value="failed">失败</option><option value="slow">慢请求 ≥ 30s</option></select></label>
          <label>时间<select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}><option value="all">全部时间</option><option value="today">今天</option><option value="24h">最近 24 小时</option><option value="7d">最近 7 天</option></select></label>
          <label>工具<select value={toolFilter} onChange={(e) => setToolFilter(e.target.value)}><option value="all">全部工具</option>{toolOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label>排序<select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}><option value="time">按时间</option><option value="duration">按耗时</option><option value="rag">按 RAG 命中</option></select></label>
          <label className="log-search">关键词<input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索问题、模型、错误、工具名" /></label>
        </div>
      </section>

      <div className="stats-grid logs-stats-grid">
        <div className="stat-card"><span>当前结果</span><strong>{stats.total}</strong><p>筛选后的调用数</p></div>
        <div className="stat-card"><span>成功率</span><strong>{stats.successRate}%</strong><p>{stats.failedCount} 次失败</p></div>
        <div className="stat-card"><span>平均耗时</span><strong>{formatDuration(stats.avgDuration)}</strong><p>模型、检索、工具</p></div>
        <div className="stat-card"><span>P95 耗时</span><strong>{formatDuration(stats.p95Duration)}</strong><p>{stats.slowCount} 次慢请求</p></div>
        <div className="stat-card"><span>平均 RAG 命中</span><strong>{stats.avgRag}</strong><p>每次命中切片</p></div>
      </div>

      {error && <div className="error-card"><strong>加载失败</strong><p>{error}</p></div>}

      <section className="panel logs-table-panel">
        <div className="panel-title compact"><span className="eyebrow">调用列表</span><h2>最近 100 次调用</h2></div>

        {!loading && filteredLogs.length === 0 && (
          <div className="empty-advice compact-empty">
            <div className="empty-icon">LOG</div>
            <h2>没有匹配的日志</h2>
            <p>可以调整筛选条件，或者去 AI 咨询 / 方案引擎运行一次。</p>
          </div>
        )}

        <div className="trace-list trace-list-v12">
          {filteredLogs.map((log) => (
            <article className={log.success ? 'trace-card' : 'trace-card trace-card-error'} key={log.id}>
              <div className="trace-head">
                <div>
                  <strong>{log.question || '未记录问题'}</strong>
                  <span>{formatDate(log.createdAt)} · {log.type || 'AI 调用'} · {log.status || '-'}</span>
                </div>
                <small className={log.success ? 'pill success' : 'pill danger'}>{log.success ? '成功' : '失败'}</small>
              </div>

              <div className="trace-metrics trace-metrics-v12">
                <div><span>模型</span><strong>{log.model || '-'}</strong></div>
                <div><span>耗时</span><strong>{formatDuration(log.durationMs)}</strong></div>
                <div><span>RAG 命中</span><strong>{log.ragHitCount || 0}</strong></div>
                <div><span>工具数量</span><strong>{log.toolNames?.length || 0}</strong></div>
              </div>

              <div className="tag-row">
                {log.toolNames?.length ? log.toolNames.map((name) => <span key={name}>{name}</span>) : <span>未触发工具</span>}
              </div>

              {log.error && <div className="error-card slim"><strong>错误信息</strong><p>{log.error}</p></div>}
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
