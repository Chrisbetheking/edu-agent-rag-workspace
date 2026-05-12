import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';

type EvalQuestion = {
  id: string;
  question: string;
  expectedSource: string;
};

type EvalResult = {
  id: string;
  question: string;
  expectedSource?: string;
  hit: boolean;
  latency: number;
  retrieved: any[];
};

type EvalPayload = {
  summary?: {
    total?: number;
    hitRate?: number;
    avgLatency?: number;
  };
  results?: EvalResult[];
};

export default function Evaluation() {
  const [questions, setQuestions] = useState<EvalQuestion[]>([]);
  const [results, set结果] = useState<EvalPayload>({ summary: {}, results: [] });
  const [question, setQuestion] = useState('英国计算机硕士一般需要哪些申请材料？');
  const [expectedSource, setExpectedSource] = useState('英国硕士申请 FAQ');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setError('');
    try {
      const [qRes, rRes] = await Promise.all([api.get('/eval/questions'), api.get('/eval/results')]);
      setQuestions(Array.isArray(qRes.data) ? qRes.data : []);
      set结果(rRes.data || { summary: {}, results: [] });
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || '加载评测数据失败');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    await api.post('/eval/questions', { question, expectedSource });
    await load();
  }

  async function run() {
    setLoading(true);
    setError('');
    try {
      await api.post('/eval/run', { topK: 3 });
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || '运行评测失败');
    } finally {
      setLoading(false);
    }
  }

  const summary = useMemo(() => ({
    total: results.summary?.total || 0,
    hitRate: Math.round((results.summary?.hitRate || 0) * 100),
    avgLatency: results.summary?.avgLatency || 0,
    badCases: (results.results || []).filter((item) => !item.hit).length,
  }), [results]);

  return (
    <section className="page-stack">
      <div className="page-title elevated">
        <div>
          <span className="eyebrow">检索评测</span>
          <h1>RAG 评测面板</h1>
          <p>用标准问题验证知识库检索是否命中预期来源，体现 AI 系统的质量评估能力。</p>
        </div>
        <button className="primary" onClick={run} disabled={loading}>{loading ? '评测中...' : '运行评测'}</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><span>评测结果</span><strong>{summary.total}</strong><p>历史 run 数</p></div>
        <div className="stat-card"><span>命中率</span><strong>{summary.hitRate}%</strong><p>期望来源命中</p></div>
        <div className="stat-card"><span>平均耗时</span><strong>{summary.avgLatency}ms</strong><p>检索耗时</p></div>
        <div className="stat-card"><span>异常样本</span><strong>{summary.badCases}</strong><p>需要补知识库</p></div>
      </div>

      {error && <div className="error-card"><strong>评测失败</strong><p>{error}</p></div>}

      <div className="two-col wide-left">
        <section className="panel form-panel">
          <div className="panel-title compact"><span className="eyebrow">测试集</span><h2>新增测试问题</h2></div>
          <form className="form-stack" onSubmit={add}>
            <label>测试问题<textarea value={question} onChange={(e) => setQuestion(e.target.value)} /></label>
            <label>期望来源<input value={expectedSource} onChange={(e) => setExpectedSource(e.target.value)} /></label>
            <button className="primary">添加问题</button>
          </form>
          <div className="question-list">
            {questions.map((q) => (
              <div className="question-row" key={q.id}>
                <strong>{q.question}</strong>
                <span>期望来源：{q.expectedSource}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-title compact"><span className="eyebrow">结果</span><h2>评测结果</h2></div>
          {results.results?.length ? results.results.map((r) => (
            <article className="eval-card" key={r.id}>
              <div className="row-between top-align">
                <div>
                  <strong>{r.question}</strong>
                  <span>{r.latency}ms · Top-K 检索结果</span>
                </div>
                <small className={r.hit ? 'pill success' : 'pill danger'}>{r.hit ? '命中' : '未命中'}</small>
              </div>
              <pre className="json-block compact-json">{JSON.stringify(r.retrieved, null, 2)}</pre>
            </article>
          )) : <div className="empty-mini">暂无评测结果。添加测试问题后点击运行评测。</div>}
        </section>
      </div>
    </section>
  );
}
