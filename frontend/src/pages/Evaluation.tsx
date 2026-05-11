import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';

export default function Evaluation() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [results, setResults] = useState<any>({ summary: {}, results: [] });
  const [question, setQuestion] = useState('英国计算机硕士一般需要哪些申请材料？');
  const [expectedSource, setExpectedSource] = useState('英国硕士申请 FAQ');

  function load() {
    api.get('/eval/questions').then((res) => setQuestions(res.data));
    api.get('/eval/results').then((res) => setResults(res.data));
  }
  useEffect(load, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    await api.post('/eval/questions', { question, expectedSource });
    load();
  }

  async function run() {
    await api.post('/eval/run', { topK: 3 });
    load();
  }

  return (
    <section>
      <div className="page-title"><div><h1>RAG 评测面板</h1><p>用于展示 Recall@K、命中率、平均耗时和 bad case 分析。</p></div><button className="primary" onClick={run}>运行评测</button></div>
      <div className="stats-grid">
        <div className="stat-card"><span>评测结果数</span><strong>{results.summary?.total || 0}</strong></div>
        <div className="stat-card"><span>命中率</span><strong>{Math.round((results.summary?.hitRate || 0) * 100)}%</strong></div>
        <div className="stat-card"><span>平均耗时</span><strong>{results.summary?.avgLatency || 0}ms</strong></div>
        <div className="stat-card"><span>Top-K</span><strong>3</strong></div>
      </div>
      <div className="two-col">
        <div className="panel">
          <h2>新增测试问题</h2>
          <form className="form-stack" onSubmit={add}>
            <textarea value={question} onChange={(e) => setQuestion(e.target.value)} />
            <input value={expectedSource} onChange={(e) => setExpectedSource(e.target.value)} />
            <button className="primary">添加问题</button>
          </form>
          {questions.map((q) => <div className="list-row" key={q.id}><strong>{q.question}</strong><span>期望来源：{q.expectedSource}</span></div>)}
        </div>
        <div className="panel">
          <h2>评测结果</h2>
          {results.results?.map((r: any) => <div className="source-card" key={r.id}><strong>{r.hit ? '命中' : '未命中'}｜{r.question}</strong><span>{r.latency}ms</span><pre>{JSON.stringify(r.retrieved, null, 2)}</pre></div>)}
        </div>
      </div>
    </section>
  );
}
