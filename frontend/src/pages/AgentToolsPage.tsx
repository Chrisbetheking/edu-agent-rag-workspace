import { FormEvent, useEffect, useState } from 'react';
import { convertCgpa, generateCopywriting, getToolLogs, recommendSchools } from '../api/tools';

type ActiveTool = 'cgpa' | 'school' | 'copywriting';

type ToolLog = {
  id: string;
  toolName: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  latencyMs: number;
  createdAt: string;
};

const toolTabs: Array<{ key: ActiveTool; name: string; desc: string }> = [
  { key: 'cgpa', name: 'CGPA 换算', desc: '把 4.0 / 5.0 / 百分制转换为申请参考区间。' },
  { key: 'school', name: '院校推荐', desc: '根据国家、专业、GPA、语言和预算生成冲刺/匹配/保底组合。' },
  { key: 'copywriting', name: '销售话术', desc: '根据学生背景生成微信话术、电话提纲和短视频脚本。' },
];

export function AgentToolsPage() {
  const [active, setActive] = useState<ActiveTool>('cgpa');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [logs, setLogs] = useState<ToolLog[]>([]);

  async function refreshLogs() {
    const data = await getToolLogs();
    setLogs(data);
  }

  useEffect(() => {
    refreshLogs().catch(() => undefined);
  }, []);

  async function runTool(handler: () => Promise<Record<string, unknown>>) {
    setLoading(true);
    try {
      const data = await handler();
      setResult(data);
      await refreshLogs();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <span className="eyebrow">Agent Tools · Phase 2</span>
        <h1>Agent 工具中心</h1>
        <p>本阶段已把 v1 原型里的 GPA、院校推荐、文案生成升级成后端工具接口，并记录调用历史。</p>
      </div>

      <div className="tool-tabs">
        {toolTabs.map((tool) => (
          <button className={active === tool.key ? 'tab active' : 'tab'} key={tool.key} onClick={() => setActive(tool.key)}>
            <strong>{tool.name}</strong>
            <span>{tool.desc}</span>
          </button>
        ))}
      </div>

      <div className="two-column">
        <section className="panel">
          {active === 'cgpa' && <CgpaForm loading={loading} onRun={runTool} />}
          {active === 'school' && <SchoolForm loading={loading} onRun={runTool} />}
          {active === 'copywriting' && <CopywritingForm loading={loading} onRun={runTool} />}
        </section>

        <section className="panel result-panel">
          <h2>工具输出</h2>
          {result ? <JsonBlock data={result} /> : <p className="muted">点击左侧运行工具后，这里会展示结构化结果。</p>}
        </section>
      </div>

      <section className="panel">
        <h2>最近工具调用记录</h2>
        {logs.length === 0 ? (
          <p className="muted">暂无调用记录。运行任意工具后会显示输入、输出、耗时。</p>
        ) : (
          <div className="log-list">
            {logs.map((log) => (
              <article className="log-item" key={log.id}>
                <div>
                  <strong>{log.toolName}</strong>
                  <span>{new Date(log.createdAt).toLocaleString()} · {log.latencyMs}ms</span>
                </div>
                <details>
                  <summary>查看输入/输出</summary>
                  <JsonBlock data={{ input: log.input, output: log.output }} />
                </details>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CgpaForm({ loading, onRun }: { loading: boolean; onRun: (handler: () => Promise<Record<string, unknown>>) => void }) {
  const [score, setScore] = useState(3.2);
  const [scale, setScale] = useState<'4.0' | '5.0' | '100'>('4.0');
  const [targetCountry, setTargetCountry] = useState('英国');

  function submit(event: FormEvent) {
    event.preventDefault();
    onRun(() => convertCgpa({ score, scale, targetCountry }));
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      <h2>CGPA 换算工具</h2>
      <label>成绩<input type="number" step="0.01" value={score} onChange={(e) => setScore(Number(e.target.value))} /></label>
      <label>满分制<select value={scale} onChange={(e) => setScale(e.target.value as '4.0' | '5.0' | '100')}><option value="4.0">4.0</option><option value="5.0">5.0</option><option value="100">100</option></select></label>
      <label>目标国家<input value={targetCountry} onChange={(e) => setTargetCountry(e.target.value)} /></label>
      <button className="primary-button" disabled={loading}>{loading ? '计算中...' : '运行换算'}</button>
    </form>
  );
}

function SchoolForm({ loading, onRun }: { loading: boolean; onRun: (handler: () => Promise<Record<string, unknown>>) => void }) {
  const [country, setCountry] = useState('英国');
  const [major, setMajor] = useState('Computer Science');
  const [gpa, setGpa] = useState(3.2);
  const [scale, setScale] = useState<'4.0' | '5.0' | '100'>('4.0');
  const [englishScore, setEnglishScore] = useState('IELTS 6.5');
  const [budget, setBudget] = useState('30万人民币');
  const [background, setBackground] = useState('APU 计算机本科，有 AI Agent 实习经历');

  function submit(event: FormEvent) {
    event.preventDefault();
    onRun(() => recommendSchools({ country, major, gpa, scale, englishScore, budget, background }));
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      <h2>院校推荐工具</h2>
      <label>目标国家<input value={country} onChange={(e) => setCountry(e.target.value)} /></label>
      <label>目标专业<input value={major} onChange={(e) => setMajor(e.target.value)} /></label>
      <label>GPA / CGPA<input type="number" step="0.01" value={gpa} onChange={(e) => setGpa(Number(e.target.value))} /></label>
      <label>满分制<select value={scale} onChange={(e) => setScale(e.target.value as '4.0' | '5.0' | '100')}><option value="4.0">4.0</option><option value="5.0">5.0</option><option value="100">100</option></select></label>
      <label>语言成绩<input value={englishScore} onChange={(e) => setEnglishScore(e.target.value)} /></label>
      <label>预算<input value={budget} onChange={(e) => setBudget(e.target.value)} /></label>
      <label>背景<textarea value={background} onChange={(e) => setBackground(e.target.value)} /></label>
      <button className="primary-button" disabled={loading}>{loading ? '生成中...' : '生成推荐'}</button>
    </form>
  );
}

function CopywritingForm({ loading, onRun }: { loading: boolean; onRun: (handler: () => Promise<Record<string, unknown>>) => void }) {
  const [studentName, setStudentName] = useState('Chris');
  const [targetCountry, setTargetCountry] = useState('英国');
  const [major, setMajor] = useState('Computer Science');
  const [gpa, setGpa] = useState(3.2);
  const [concern, setConcern] = useState('担心 CGPA 不够和预算超支');
  const [background, setBackground] = useState('APU CS 本科，想申请硕士，有项目经历');

  function submit(event: FormEvent) {
    event.preventDefault();
    onRun(() => generateCopywriting({ studentName, targetCountry, major, gpa, concern, background }));
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      <h2>销售话术生成工具</h2>
      <label>学生称呼<input value={studentName} onChange={(e) => setStudentName(e.target.value)} /></label>
      <label>目标国家<input value={targetCountry} onChange={(e) => setTargetCountry(e.target.value)} /></label>
      <label>目标专业<input value={major} onChange={(e) => setMajor(e.target.value)} /></label>
      <label>GPA<input type="number" step="0.01" value={gpa} onChange={(e) => setGpa(Number(e.target.value))} /></label>
      <label>主要顾虑<input value={concern} onChange={(e) => setConcern(e.target.value)} /></label>
      <label>学生背景<textarea value={background} onChange={(e) => setBackground(e.target.value)} /></label>
      <button className="primary-button" disabled={loading}>{loading ? '生成中...' : '生成话术'}</button>
    </form>
  );
}

function JsonBlock({ data }: { data: unknown }) {
  return <pre className="json-block">{JSON.stringify(data, null, 2)}</pre>;
}
