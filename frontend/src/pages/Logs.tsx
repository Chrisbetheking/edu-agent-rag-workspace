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
type SortKey = 'time' | 'duration' | 'rag';

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

function isWithinTime(item: CallLogItem, filter: TimeFilter) {
  if (filter === 'all') return true;
  const created = new Date(item.createdAt).getTime();
  if (!created) return false;
  const now = Date.now();
  if (filter === '24h') return now - created <= 24 * 60 * 60 * 1000;
  if (filter === '7d') return now - created <= 7 * 24 * 60 * 60 * 1000;
  const localDay = new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
  const itemDay = new Date(item.createdAt).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
  return localDay === itemDay;
}

export default function Logs() {
  const [logs, setLogs] = useState<CallLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [toolFilter, setToolFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('time');
  const [keyword, setKeyword] = useState('');

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

  useEffect(() => { loadLogs(); }, []);

  const toolOptions = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((item) => (item.toolNames || []).forEach((name) => name && set.add(name)));
    return Array.from(set).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return logs
      .filter((item) => {
        if (statusFilter === 'success' && !item.success) return false;
        if (statusFilter === 'failed' && item.success) return false;
        if (statusFilter === 'slow' && Number(item.durationMs || 0) < 30000) return false;
        if (!isWithinTime(item, timeFilter)) return false;
        if (toolFilter !== 'all' && !(item.toolNames || []).includes(toolFilter)) return false;
        if (!kw) return true;
        const haystack = [item.question, item.model, item.type, item.status, item.error, ...(item.toolNames || [])].join(' ').toLowerCase();
        return haystack.includes(kw);
      })
      .sort((a, b) => {
        if (sortKey === 'duration') return Number(b.durationMs || 0) - Number(a.durationMs || 0);
        if (sortKey === 'rag') return Number(b.ragHitCount || 0) - Number(a.ragHitCount || 0);
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [logs, statusFilter, timeFilter, toolFilter, sortKey, keyword]);

  const stats = useMemo(() => {
    const total = filteredLogs.length;
    const successCount = filteredLogs.filter((item) => item.success).length;
    const durations = filteredLogs.map((item) => Number(item.durationMs || 0)).filter((x) => x >= 0);
    const avgDuration = total ? Math.round(durations.reduce((sum, item) => sum + item, 0) / total) : 0;
    const avgRag = total ? (filteredLogs.reduce((sum, item) => sum + Number(item.ragHitCount || 0), 0) / total).toFixed(1) : '0';
    const p95 = percentile(durations, 95);
    const slowCount = filteredLogs.filter((item) => Number(item.durationMs || 0) >= 30000).length;
    return { total, successCount, failedCount: total - successCount, successRate: total ? Math.round((successCount / total) * 100) : 0, avgDuration, avgRag, p95, slowCount };
  }, [filteredLogs]);

  return (
    <section className="page-stack logs-page-v13">
      <div className="page-title elevated">
        <div>
          <span className="eyebrow">日志</span>
          <h1>调用日志</h1>
          <p>筛选慢请求、失败调用和工具链，用于定位模型耗时、RAG 命中和前端异常。</p>
        </div>
        <button className="primary" onClick={loadLogs} disabled={loading}>{loading ? '刷新中...' : '刷新日志'}</button>
      </div>

      <section className="panel log-filter-panel">
        <div className="filter-grid-v13">
          <label>状态<select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}><option value="all">全部</option><option value="success">成功</option><option value="failed">失败</option><option value="slow">慢请求 ≥30s</option></select></label>
          <label>时间<select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}><option value="all">全部</option><option value="today">今天</option><option value="24h">最近24小时</option><option value="7d">最近7天</option></select></label>
          <label>工具<select value={toolFilter} onChange={(e) => setToolFilter(e.target.value)}><option value="all">全部工具</option>{toolOptions.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
          <label>排序<select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}><option value="time">按时间</option><option value="duration">按耗时</option><option value="rag">按 RAG 命中</option></select></label>
          <label className="filter-search">关键词<input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索问题、模型、错误、工具名" /></label>
        </div>
      </section>

      <div className="stats-grid six log-stats-v13">
        <div className="stat-card"><span>筛选结果</span><strong>{stats.total}</strong><p>当前视图</p></div>
        <div className="stat-card"><span>成功率</span><strong>{stats.successRate}%</strong><p>{stats.failedCount} 次失败</p></div>
        <div className="stat-card"><span>平均耗时</span><strong>{formatDuration(stats.avgDuration)}</strong><p>筛选范围</p></div>
        <div className="stat-card"><span>P95 耗时</span><strong>{formatDuration(stats.p95)}</strong><p>尾部延迟</p></div>
        <div className="stat-card"><span>慢请求</span><strong>{stats.slowCount}</strong><p>≥30s</p></div>
        <div className="stat-card"><span>平均 RAG 命中</span><strong>{stats.avgRag}</strong><p>每次命中切片</p></div>
      </div>

      {error && <div className="error-card"><strong>加载失败</strong><p>{error}</p></div>}

      <section className="panel">
        <div className="panel-title compact"><span className="eyebrow">调用列表</span><h2>最近 100 次 AI 调用</h2></div>
        {!loading && filteredLogs.length === 0 && (
          <div className="empty-advice compact-empty"><div className="empty-icon">LOG</div><h2>没有符合条件的日志</h2><p>可以调整筛选条件，或去 AI 咨询页生成一次回答。</p></div>
        )}
        <div className="trace-list log-list-v13">
          {filteredLogs.map((log) => (
            <article className={`trace-card ${log.success ? '' : 'trace-card-failed'}`} key={log.id}>
              <div className="trace-head">
                <div>
                  <strong>{log.question || '未记录问题'}</strong>
                  <span>{formatDate(log.createdAt)} · {log.type || 'AI 调用'}</span>
                </div>
                <small className={log.success ? 'pill success' : 'pill danger'}>{log.success ? '成功' : '失败'}</small>
              </div>
              <div className="trace-metrics trace-metrics-v13">
                <div><span>模型</span><strong>{log.model || '-'}</strong></div>
                <div><span>耗时</span><strong>{formatDuration(log.durationMs)}</strong></div>
                <div><span>RAG 命中</span><strong>{log.ragHitCount || 0}</strong></div>
                <div><span>工具数量</span><strong>{log.toolNames?.length || 0}</strong></div>
              </div>
              <div className="tag-row">{log.toolNames?.length ? log.toolNames.map((name) => <span key={name}>{name}</span>) : <span>本次未触发工具</span>}</div>
              {log.error && <div className="error-card slim"><strong>错误信息</strong><p>{log.error}</p></div>}
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
