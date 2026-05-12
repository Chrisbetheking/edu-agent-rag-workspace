import { FormEvent, ReactNode, useMemo, useState } from 'react';
import { api } from '../api/client';
import { asArray, downloadText, jsonMarkdown, stringifySafe } from '../utils/export';

type ToolKey = 'advisor' | 'cgpa' | 'school' | 'copywriting' | 'material' | 'application';

const toolTabs: Array<{ key: ToolKey; name: string; desc: string; tag: string }> = [
  { key: 'advisor', name: 'AI 综合方案', desc: '串联成绩、选校、销售、文书、材料和递交。', tag: 'Agent' },
  { key: 'cgpa', name: 'CGPA 换算', desc: '把 4.0 / 5.0 / 百分制换成申请判断。', tag: 'Academic' },
  { key: 'school', name: '院校推荐', desc: 'AI 输出冲刺、匹配、保底三档院校。', tag: 'Planning' },
  { key: 'copywriting', name: '销售话术', desc: '生成微信沟通、电话提纲和异议处理。', tag: 'Growth' },
  { key: 'material', name: '材料清单', desc: '按国家和学位整理申请材料 checklist。', tag: 'Ops' },
  { key: 'application', name: '申请后台', desc: '生成文书重点、初稿、材料和递交流程。', tag: 'CRM' },
];

function ResultCard({ title, children }: { title: string; children: ReactNode }) {
  return <article className="ops-card enhanced-card"><h3>{title}</h3>{children}</article>;
}

function KeyValueGrid({ data }: { data: Record<string, any> }) {
  return (
    <div className="result-summary-grid">
      {Object.entries(data || {}).slice(0, 8).map(([key, value]) => (
        <div className="profile-item clean" key={key}>
          <span>{key}</span>
          <strong>{Array.isArray(value) ? `${value.length} items` : typeof value === 'object' && value ? 'object' : stringifySafe(value).slice(0, 42) || '-'}</strong>
        </div>
      ))}
    </div>
  );
}

function SchoolBands({ data }: { data: any }) {
  const bands = [
    ['冲刺', data?.reach],
    ['匹配', data?.match],
    ['保底', data?.safe],
  ];
  return (
    <div className="tier-grid compact-tier-grid">
      {bands.map(([label, items]) => (
        <article className="tier-card" key={String(label)}>
          <span className="eyebrow">{String(label)}</span>
          {asArray(items).map((school: any, index) => (
            <div className="school-row" key={school.name || index}>
              <strong>{school.name || stringifySafe(school)}</strong>
              {school.reason && <p>{school.reason}</p>}
              {school.action && <small>{school.action}</small>}
            </div>
          ))}
        </article>
      ))}
    </div>
  );
}

function AdvisorView({ result }: { result: any }) {
  const outputs = result.outputs || {};
  return (
    <div className="agent-output-stack">
      <div className="agent-summary-card">
        <span className="eyebrow">Agent Summary</span>
        <h2>{result.executiveSummary || '综合方案已生成'}</h2>
        <div className="tag-row">
          <span>{result.agentTrace?.mode || 'agent'}</span>
          <span>{result.agentTrace?.model || 'deepseek-chat'}</span>
          <span>{result.agentTrace?.durationMs || 0}ms</span>
        </div>
      </div>

      <section className="panel-lite">
        <h3>工具链执行 Trace</h3>
        <div className="workflow-grid">
          {asArray(result.workflow).map((step: any, index) => (
            <div className="workflow-step" key={step.name || index}>
              <em>{step.step || index + 1}</em>
              <strong>{step.name || 'Step'}</strong>
              <span>{step.tool || '-'}</span>
              <p>{step.output || step.status || 'done'}</p>
            </div>
          ))}
        </div>
      </section>

      {outputs.schools && <SchoolBands data={outputs.schools} />}

      <div className="two-col">
        <ResultCard title="前台增长内容">
          <p>{outputs.growth?.xiaohongshu?.title || outputs.growth?.brief || '-'}</p>
          <ul>{asArray(outputs.growth?.wechatFollowup).slice(0, 3).map((x, i) => <li key={i}>{stringifySafe(x)}</li>)}</ul>
        </ResultCard>
        <ResultCard title="申请文书初稿">
          <p>{outputs.application?.drafts?.personalStatement || '-'}</p>
        </ResultCard>
      </div>

      <div className="two-col">
        <ResultCard title="材料清单"><div className="tag-row">{asArray(outputs.materials?.required).map((x, i) => <span key={i}>{stringifySafe(x)}</span>)}</div></ResultCard>
        <ResultCard title="团队交接"><ul>{asArray(result.handoff).map((x: any, i) => <li key={i}>{x.team ? `${x.team}：${x.action}` : stringifySafe(x)}</li>)}</ul></ResultCard>
      </div>
    </div>
  );
}

function GenericResult({ result, active }: { result: any; active: ToolKey }) {
  if (active === 'advisor' && result.outputs) return <AdvisorView result={result} />;
  if ((active === 'school' || result.reach || result.match || result.safe) && (result.reach || result.match || result.safe)) return <SchoolBands data={result} />;
  if (active === 'application' && result.writingBrief) {
    return (
      <div className="ops-card-grid">
        <ResultCard title="PS 主题"><p>{result.writingBrief?.psTheme}</p></ResultCard>
        <ResultCard title="文书初稿"><p>{result.drafts?.personalStatement}</p></ResultCard>
        <ResultCard title="材料清单"><div className="tag-row">{asArray(result.materialChecklist).map((x, i) => <span key={i}>{stringifySafe(x)}</span>)}</div></ResultCard>
      </div>
    );
  }
  if (active === 'copywriting') {
    return (
      <div className="ops-card-grid">
        <ResultCard title="微信话术"><p>{result.wechat}</p></ResultCard>
        <ResultCard title="异议处理"><ul>{asArray(result.objectionHandling).map((x: any, i) => <li key={i}>{x.concern ? `${x.concern}：${x.answer}` : stringifySafe(x)}</li>)}</ul></ResultCard>
        <ResultCard title="电话提纲"><ul>{asArray(result.callOutline).map((x, i) => <li key={i}>{stringifySafe(x)}</li>)}</ul></ResultCard>
      </div>
    );
  }
  return <KeyValueGrid data={result || {}} />;
}

export default function Tools() {
  const [active, setActive] = useState<ToolKey>('advisor');
  const [cgpa, setCgpa] = useState('3.2');
  const [scale, setScale] = useState('4');
  const [country, setCountry] = useState('英国');
  const [major, setMajor] = useState('计算机科学');
  const [budget, setBudget] = useState('30万人民币');
  const [language, setLanguage] = useState('IELTS 6.5');
  const [name, setName] = useState('Chris');
  const [concern, setConcern] = useState('担心 CGPA 不够和预算超支，希望用项目经历提升竞争力');
  const [degree, setDegree] = useState('硕士');
  const [experience, setExperience] = useState('马来西亚 APU 计算机本科，有软件项目、AI/数据项目、实习和 GitHub 作品集');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const activeMeta = useMemo(() => toolTabs.find((item) => item.key === active) || toolTabs[0], [active]);

  const payload = useMemo(() => ({
    cgpa: Number(cgpa),
    gpa: cgpa,
    scale: Number(scale),
    country,
    targetCountry: country,
    major,
    budget,
    language,
    englishScore: language,
    name,
    studentName: name,
    concern,
    angle: concern,
    degree,
    experience,
    background: experience,
    student: experience,
    platform: '小红书 + 短视频 + 微信私域',
  }), [cgpa, scale, country, major, budget, language, name, concern, degree, experience]);

  function endpointFor(type: ToolKey) {
    if (type === 'cgpa') return '/tools/cgpa-convert';
    if (type === 'school') return '/tools/school-recommend';
    if (type === 'copywriting') return '/tools/copywriting';
    if (type === 'application') return '/tools/application-plan';
    if (type === 'advisor') return '/tools/advisor-suite';
    return '/tools/material-list';
  }

  async function callTool(type: ToolKey, e?: FormEvent) {
    e?.preventDefault();
    setActive(type);
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const { data } = await api.post(endpointFor(type), payload);
      setResult(data || {});
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || '工具调用失败');
    } finally {
      setLoading(false);
    }
  }

  const exportText = result?.exportMarkdown || jsonMarkdown(`${activeMeta.name}结果`, result || {});

  return (
    <section className="page-stack">
      <div className="page-title elevated">
        <div>
          <span className="eyebrow">Agent Toolchain</span>
          <h1>Agent 工具中心</h1>
          <p>把留学咨询中的重复判断封装成可调用工具，并把前台、销售、申请后台和材料流程串成一个完整 Agent 工作流。</p>
        </div>
        <div className="title-actions">
          <span className="status-dot">AI toolchain online</span>
          {result && <button className="ghost-button" onClick={() => downloadText(`agent-${active}.md`, exportText)}>导出结果</button>}
          {result && <button className="ghost-button" onClick={() => downloadText(`agent-${active}.json`, JSON.stringify(result, null, 2), 'application/json;charset=utf-8')}>导出 JSON</button>}
        </div>
      </div>

      <div className="tool-tabs pro-tabs">
        {toolTabs.map((tool) => (
          <button className={active === tool.key ? 'tab active' : 'tab'} key={tool.key} onClick={() => setActive(tool.key)}>
            <em>{tool.tag}</em>
            <strong>{tool.name}</strong>
            <span>{tool.desc}</span>
          </button>
        ))}
      </div>

      {error && <div className="error-card"><strong>工具调用失败</strong><p>{error}</p></div>}
      {result?.llmFallbackReason && <div className="permission-banner">AI 调用已自动降级：{result.llmFallbackReason}</div>}

      <div className="two-col wide-right">
        <section className="panel form-panel sticky-panel">
          <div className="panel-title compact"><span className="eyebrow">Input</span><h2>{activeMeta.name}</h2></div>
          <form className="form-stack" onSubmit={(e) => callTool(active, e)}>
            <div className="form-grid two">
              <label>学生称呼<input value={name} onChange={(e) => setName(e.target.value)} /></label>
              <label>CGPA / GPA<input value={cgpa} onChange={(e) => setCgpa(e.target.value)} /></label>
              <label>满分制<select value={scale} onChange={(e) => setScale(e.target.value)}><option value="4">4.0</option><option value="5">5.0</option><option value="100">100</option></select></label>
              <label>目标国家<input value={country} onChange={(e) => setCountry(e.target.value)} /></label>
              <label>目标专业<input value={major} onChange={(e) => setMajor(e.target.value)} /></label>
              <label>申请学位<input value={degree} onChange={(e) => setDegree(e.target.value)} /></label>
              <label>预算<input value={budget} onChange={(e) => setBudget(e.target.value)} /></label>
              <label>语言成绩<input value={language} onChange={(e) => setLanguage(e.target.value)} /></label>
            </div>
            <label>项目 / 实习 / 课程经历<textarea value={experience} onChange={(e) => setExperience(e.target.value)} /></label>
            <label>核心顾虑<textarea value={concern} onChange={(e) => setConcern(e.target.value)} /></label>
            <div className="button-grid">
              <button className="primary" disabled={loading}>{loading ? 'AI 运行中...' : `运行：${activeMeta.name}`}</button>
              <button className="ghost-button" type="button" disabled={loading} onClick={() => callTool('advisor')}>运行完整 Agent 流</button>
            </div>
          </form>
        </section>

        <section className="panel result-panel">
          <div className="panel-title">
            <div><span className="eyebrow">Output</span><h2>结构化业务结果</h2></div>
            {result && <span className="pill success">ready</span>}
          </div>
          {result ? (
            <>
              <GenericResult result={result} active={active} />
              <details className="raw-json-details">
                <summary>查看原始 JSON</summary>
                <pre className="json-block">{JSON.stringify(result, null, 2)}</pre>
              </details>
            </>
          ) : (
            <div className="empty-advice compact-empty">
              <div className="empty-icon">⌘</div>
              <h2>选择工具并运行</h2>
              <p>推荐先点“运行完整 Agent 流”，它会展示工具如何串联前台获客、销售跟进、选校、文书和材料流程。</p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
