import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, AI_LOADING_HINT, describeDeployment, type DeploymentInfo } from '../api/client';

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
  top1Hit?: boolean;
  top3Hit?: boolean;
  firstHitRank?: number | null;
  mrr?: number;
  latency: number;
  cacheHit?: boolean;
  retrievalModes?: string[];
  maxScore?: number;
  retrieved: any[];
};

type EvalPayload = {
  deployment?: DeploymentInfo;
  summary?: {
    total?: number;
    hitRate?: number;
    hitAt1?: number;
    hitAt3?: number;
    mrr?: number;
    avgLatency?: number;
    p95Latency?: number;
    cacheHitRate?: number;
  };
  results?: EvalResult[];
};

const starterQuestions = [
  ['英国计算机硕士申请一般需要提交哪些材料？', '02_英国硕士申请材料清单|英国硕士申请 FAQ'],
  ['英国计算机硕士申请整体要看哪些背景因素？', '01_英国计算机硕士申请总览'],
  ['APU 或马来西亚本科 CGPA 3.2 申请英国计算机硕士竞争力如何解释？', '03_CGPA|16_马来西亚本科背景'],
  ['低 GPA 申请英国计算机硕士，Personal Statement 应该怎么写？', '06_Personal|文书写作'],
  ['CV 简历和项目经历应该如何包装，才能增强计算机硕士申请？', '07_CV|项目包装'],
  ['推荐信应该找谁写，英国硕士申请推荐信怎么准备？', '08_推荐信|推荐信准备'],
  ['雅思、托福或语言成绩不够时，英国硕士申请可以怎么处理？', '09_语言|语言成绩|语言班'],
  ['英国计算机硕士选校怎么分冲刺、匹配和保底？', '05_英国计算机硕士选校|选校分层'],
];

function pct(value?: number) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

function RuntimeMini({ deployment }: { deployment?: DeploymentInfo }) {
  if (!deployment) return null;
  const live = deployment.mode === 'live_api';
  return (
    <div className={live ? 'runtime-banner live compact-runtime' : 'runtime-banner fallback compact-runtime'}>
      <div>
        <strong>{live ? '后端评测已接入' : '暂时展示备用评测'}</strong>
        <span>{live ? '本次走后端检索评测接口。' : describeDeployment(deployment)}</span>
      </div>
      <em>{deployment.latencyMs ? `${deployment.latencyMs}ms` : ''}</em>
    </div>
  );
}

function fmt(value?: number) {
  const ms = Number(value || 0);
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

export default function Evaluation() {
  const [questions, setQuestions] = useState<EvalQuestion[]>([]);
  const [results, setResults] = useState<EvalPayload>({ summary: {}, results: [] });
  const [question, setQuestion] = useState('英国计算机硕士申请一般需要提交哪些材料？');
  const [expectedSource, setExpectedSource] = useState('02_英国硕士申请材料清单');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setError('');
    try {
      const [qRes, rRes] = await Promise.all([api.get('/eval/questions'), api.get('/eval/results')]);
      setQuestions(Array.isArray(qRes.data) ? qRes.data : []);
      setResults(rRes.data || { summary: {}, results: [] });
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || '加载评测数据失败');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/eval/questions', { question, expectedSource });
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || '添加评测问题失败');
    }
  }

  async function seedQuestion(item: string[]) {
    setQuestion(item[0]);
    setExpectedSource(item[1]);
  }


  async function seedAllQuestions() {
    setLoading(true);
    setError('');
    try {
      for (const item of starterQuestions) {
        await api.post('/eval/questions', { question: item[0], expectedSource: item[1] });
      }
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || '导入标准问题失败');
    } finally {
      setLoading(false);
    }
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
    hitRate: results.summary?.hitRate || 0,
    hitAt1: results.summary?.hitAt1 || 0,
    hitAt3: results.summary?.hitAt3 || 0,
    mrr: results.summary?.mrr || 0,
    avgLatency: results.summary?.avgLatency || 0,
    p95Latency: results.summary?.p95Latency || 0,
    cacheHitRate: results.summary?.cacheHitRate || 0,
    badCases: (results.results || []).filter((item) => !item.hit).length,
  }), [results]);

  return (
    <section className="page-stack">
      <div className="page-title elevated">
        <div>
          <span className="eyebrow">检索评测</span>
          <h1>RAG 评测面板</h1>
          <p>用固定问题集看检索到底准不准：第一条有没有命中、Top-3 是否覆盖、排序质量和耗时是否稳定。</p>
        </div>
        <div className="inline-actions"><button className="ghost-button" onClick={seedAllQuestions} disabled={loading}>导入8个标准问题</button><button className="primary" onClick={run} disabled={loading}>{loading ? '评测中…' : '运行 Top-3 评测'}</button></div>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><span>评测结果</span><strong>{summary.total}</strong><p>历史样本数</p></div>
        <div className="stat-card"><span>Hit@1</span><strong>{pct(summary.hitAt1)}</strong><p>第一条命中</p></div>
        <div className="stat-card"><span>Hit@3</span><strong>{pct(summary.hitAt3 || summary.hitRate)}</strong><p>Top-3 命中</p></div>
        <div className="stat-card"><span>MRR</span><strong>{summary.mrr.toFixed(3)}</strong><p>排序质量</p></div>
        <div className="stat-card"><span>平均耗时</span><strong>{fmt(summary.avgLatency)}</strong><p>平均检索</p></div>
        <div className="stat-card"><span>P95 耗时</span><strong>{fmt(summary.p95Latency)}</strong><p>最慢一批</p></div>
        <div className="stat-card"><span>缓存命中</span><strong>{pct(summary.cacheHitRate)}</strong><p>重复问题命中</p></div>
        <div className="stat-card"><span>异常样本</span><strong>{summary.badCases}</strong><p>需要补知识库或 rerank</p></div>
      </div>

      {error && <div className="error-card"><strong>评测失败</strong><p>{error}</p></div>}
      {loading && <div className="permission-banner">{AI_LOADING_HINT}</div>}
      {results.deployment && <RuntimeMini deployment={results.deployment} />}

      <div className="two-col wide-left">
        <section className="panel form-panel">
          <div className="panel-title compact"><span className="eyebrow">测试集</span><h2>新增测试问题</h2></div>
          <form className="form-stack" onSubmit={add}>
            <label>测试问题<textarea value={question} onChange={(e) => setQuestion(e.target.value)} /></label>
            <label>期望来源<input value={expectedSource} onChange={(e) => setExpectedSource(e.target.value)} placeholder="支持 | 分隔多个可接受标题" /></label>
            <button className="primary">添加问题</button>
          </form>

          <div className="question-list">
            <strong>8 个标准问题模板</strong>
            {starterQuestions.map((item) => (
              <button type="button" className="question-row" key={item[0]} onClick={() => seedQuestion(item)}>
                <strong>{item[0]}</strong>
                <span>期望来源：{item[1]}</span>
              </button>
            ))}
          </div>

          <div className="question-list">
            <strong>当前测试集</strong>
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
                  <span>{fmt(r.latency)} · 期望：{r.expectedSource || '-'} · firstHitRank：{r.firstHitRank || '-'}</span>
                </div>
                <small className={r.hit ? 'pill success' : 'pill danger'}>{r.hit ? 'Hit@3' : 'Miss'}</small>
              </div>

              <div className="tag-row">
                <span>Top1: {r.top1Hit ? 'yes' : 'no'}</span>
                <span>MRR: {Number(r.mrr || 0).toFixed(3)}</span>
                <span>maxScore: {Number(r.maxScore || 0).toFixed(2)}</span>
                <span>cache: {r.cacheHit ? 'hit' : 'miss'}</span>
                <span>mode: {(r.retrievalModes || []).join(' / ') || '-'}</span>
              </div>

              <div className="source-rank-list readable-source-rank-list">
                {(r.retrieved || []).map((item, index) => (
                  <div className={`history-row ${index === 0 ? 'top-source-row' : ''}`} key={`${r.id}-${item.documentTitle}-${index}`}>
                    <strong>{index + 1}. {item.documentTitle || '未命名来源'}</strong>
                    <span>score {Number(item.score || 0).toFixed(2)} · vector {Number(item.vectorScore || 0).toFixed(2)} · keyword {Number(item.keywordScore || 0).toFixed(2)} · boost {Number(item.hybridBoost || 0).toFixed(2)} · {item.retrievalMode || '-'}</span>
                    {item.content && <p className="muted-text">{item.content}</p>}
                  </div>
                ))}
              </div>

              <details className="raw-json-details"><summary>查看原始 retrieved JSON</summary><pre className="json-block compact-json">{JSON.stringify(r.retrieved, null, 2)}</pre></details>
            </article>
          )) : <div className="empty-mini">暂无评测结果。添加测试问题后点击运行评测。</div>}
        </section>
      </div>
    </section>
  );
}
