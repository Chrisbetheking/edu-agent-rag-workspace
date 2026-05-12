import { FormEvent, useMemo, useState } from 'react';
import { api } from '../api/client';
import { asArray, downloadText, jsonMarkdown, stringifySafe } from '../utils/export';

type ToolKey = 'score' | 'school' | 'application' | 'copywriting' | 'advisor' | 'material';

const toolTabs: Array<{ key: ToolKey; name: string; tag: string; desc: string }> = [
  { key: 'score', name: '适配评分', tag: '算法', desc: 'GPA、专业、项目、语言、预算' },
  { key: 'school', name: '选校分层', tag: '规划', desc: '冲刺 / 匹配 / 保底' },
  { key: 'application', name: '申请案卷', tag: '文书', desc: 'PS、CV、材料流程' },
  { key: 'copywriting', name: '销售跟进', tag: '转化', desc: '微信、电话、异议处理' },
  { key: 'advisor', name: '完整流程', tag: '编排', desc: '一键串联多个工具' },
  { key: 'material', name: '材料清单', tag: '规则', desc: '必选、可选、命名规范' },
];

const countryOptions = ['英国', '澳洲', '新加坡', '香港', '加拿大'];
const majorOptions = ['计算机科学', '数据科学', '人工智能', '软件工程', '商业分析', '信息系统'];
const degreeOptions = ['硕士', '本科', '博士'];
const budgetOptions = ['20万人民币', '25万人民币', '30万人民币', '35万人民币', '40万人民币以上'];
const languageOptions = ['IELTS 6.5', 'IELTS 7.0', 'TOEFL 90', 'PTE 65', '暂未考试'];

function ResultCard({ title, children }: { title: string; children: any }) {
  return <article className="ops-card enhanced-card"><h3>{title}</h3>{children}</article>;
}

function ScoreView({ result }: { result: any }) {
  return (
    <div className="agent-output-stack">
      <div className="agent-summary-card score-summary-card">
        <span className="eyebrow">申请适配评分</span>
        <h2>{result.overall}/100 · {result.band} 档</h2>
        <p>{result.tierAdvice?.strategy}</p>
        <div className="tag-row"><span>算法：{result.algorithm}</span><span>折算：{result.percentage}%</span></div>
      </div>
      <div className="score-factor-grid large-score-grid">
        {asArray(result.factors).map((factor: any) => (
          <div className="score-factor" key={factor.key || factor.label}>
            <div><strong>{factor.label}</strong><em>{factor.score}</em></div>
            <div className="usage-bar"><i style={{ width: `${Math.max(8, Math.min(100, Number(factor.score || 0)))}%` }} /></div>
            <span>{factor.evidence}</span>
          </div>
        ))}
      </div>
      <div className="two-col">
        <ResultCard title="选校配比"><p>冲刺 {result.tierAdvice?.reach} 所，匹配 {result.tierAdvice?.match} 所，保底 {result.tierAdvice?.safe} 所。</p></ResultCard>
        <ResultCard title="风险点"><ul>{asArray(result.risks).map((x, i) => <li key={i}>{stringifySafe(x)}</li>)}</ul></ResultCard>
      </div>
    </div>
  );
}

function SchoolBands({ data }: { data: any }) {
  const bands = [
    ['冲刺', data.reach],
    ['匹配', data.match],
    ['保底', data.safe],
  ];
  return (
    <div className="school-bands-grid">
      {bands.map(([title, items]: any) => (
        <article className="school-band-card" key={title}>
          <h3>{title}</h3>
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
        <span className="eyebrow">流程结果</span>
        <h2>{result.executiveSummary || '已生成综合方案'}</h2>
        <div className="tag-row">
          <span>{result.agentTrace?.model || 'deepseek-chat'}</span>
          <span>{result.agentTrace?.durationMs || 0}ms</span>
          {outputs.fit && <span>评分 {outputs.fit.overall}/100</span>}
        </div>
      </div>

      {outputs.fit && <ScoreView result={outputs.fit} />}

      <section className="panel-lite">
        <h3>执行步骤</h3>
        <div className="workflow-grid">
          {asArray(result.workflow).map((step: any, index) => (
            <div className="workflow-step" key={step.name || index}>
              <em>{step.step || index + 1}</em><strong>{step.name || 'Step'}</strong><span>{step.tool || '-'}</span><p>{step.output || step.status || 'done'}</p>
            </div>
          ))}
        </div>
      </section>

      {outputs.schools && <SchoolBands data={outputs.schools} />}

      <div className="two-col">
        <ResultCard title="销售跟进"><p>{outputs.sales?.wechat || '-'}</p></ResultCard>
        <ResultCard title="文书初稿"><p>{outputs.application?.drafts?.personalStatement || '-'}</p></ResultCard>
      </div>
      <div className="two-col">
        <ResultCard title="材料清单"><div className="tag-row">{asArray(outputs.materials?.required).map((x, i) => <span key={i}>{stringifySafe(x)}</span>)}</div></ResultCard>
        <ResultCard title="交接事项"><ul>{asArray(result.handoff).map((x: any, i) => <li key={i}>{x.team ? `${x.team}：${x.action}` : stringifySafe(x)}</li>)}</ul></ResultCard>
      </div>
    </div>
  );
}

function GenericResult({ result, active }: { result: any; active: ToolKey }) {
  if (active === 'score' || result.algorithm === 'weighted-fit-v1') return <ScoreView result={result} />;
  if (active === 'advisor' && result.outputs) return <AdvisorView result={result} />;
  if ((active === 'school' || result.reach || result.match || result.safe) && (result.reach || result.match || result.safe)) return <SchoolBands data={result} />;
  if (active === 'application' && result.writingBrief) {
    return <div className="ops-card-grid"><ResultCard title="PS 主题"><p>{result.writingBrief?.psTheme}</p></ResultCard><ResultCard title="文书初稿"><p>{result.drafts?.personalStatement}</p></ResultCard><ResultCard title="材料清单"><div className="tag-row">{asArray(result.materialChecklist).map((x, i) => <span key={i}>{stringifySafe(x)}</span>)}</div></ResultCard></div>;
  }
  if (active === 'copywriting') {
    return <div className="ops-card-grid"><ResultCard title="微信话术"><p>{result.wechat}</p></ResultCard><ResultCard title="异议处理"><ul>{asArray(result.objectionHandling).map((x: any, i) => <li key={i}>{x.concern ? `${x.concern}：${x.answer}` : stringifySafe(x)}</li>)}</ul></ResultCard><ResultCard title="电话提纲"><ul>{asArray(result.callOutline).map((x, i) => <li key={i}>{stringifySafe(x)}</li>)}</ul></ResultCard></div>;
  }
  return <pre className="json-block">{JSON.stringify(result || {}, null, 2)}</pre>;
}

export default function Tools() {
  const [active, setActive] = useState<ToolKey>('score');
  const [cgpa, setCgpa] = useState('3.2');
  const [scale, setScale] = useState('4');
  const [country, setCountry] = useState('英国');
  const [major, setMajor] = useState('计算机科学');
  const [budget, setBudget] = useState('30万人民币');
  const [language, setLanguage] = useState('IELTS 6.5');
  const [name, setName] = useState('Chris');
  const [concern, setConcern] = useState('担心 CGPA 不够，希望用项目经历提升竞争力');
  const [degree, setDegree] = useState('硕士');
  const [experience, setExperience] = useState('马来西亚 APU 计算机本科，有软件项目、AI/数据项目、实习和 GitHub 作品集');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const activeMeta = useMemo(() => toolTabs.find((item) => item.key === active) || toolTabs[0], [active]);
  const payload = useMemo(() => ({ cgpa: Number(cgpa), gpa: cgpa, scale: Number(scale), country, targetCountry: country, major, budget, language, englishScore: language, name, studentName: name, concern, angle: concern, degree, experience, background: experience, student: experience, platform: '小红书 + 微信私域' }), [cgpa, scale, country, major, budget, language, name, concern, degree, experience]);

  function endpointFor(type: ToolKey) {
    if (type === 'score') return '/tools/profile-fit';
    if (type === 'school') return '/tools/school-recommend';
    if (type === 'copywriting') return '/tools/copywriting';
    if (type === 'application') return '/tools/application-plan';
    if (type === 'advisor') return '/tools/advisor-suite';
    return '/tools/material-list';
  }

  async function callTool(type: ToolKey, e?: FormEvent) {
    e?.preventDefault();
    setActive(type); setLoading(true); setError(''); setResult(null);
    try {
      const { data } = await api.post(endpointFor(type), payload);
      setResult(data || {});
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || '工具调用失败');
    } finally { setLoading(false); }
  }

  const exportText = result?.exportMarkdown || jsonMarkdown(`${activeMeta.name}结果`, result || {});

  return (
    <section className="page-stack compact-page">
      <div className="page-title elevated clean-title">
        <div><span className="eyebrow">方案引擎</span><h1>评分与工具编排</h1><p>把留学咨询里的重复判断做成可调用工具：先评分，再分层，再生成材料。</p></div>
        <div className="title-actions">{result && <button className="ghost-button" onClick={() => downloadText(`tool-${active}.md`, exportText)}>导出 Markdown</button>}{result && <button className="ghost-button" onClick={() => downloadText(`tool-${active}.json`, JSON.stringify(result, null, 2), 'application/json;charset=utf-8')}>导出 JSON</button>}</div>
      </div>

      <div className="tool-tabs pro-tabs compact-tabs">
        {toolTabs.map((tool) => <button className={active === tool.key ? 'tab active' : 'tab'} key={tool.key} onClick={() => setActive(tool.key)}><em>{tool.tag}</em><strong>{tool.name}</strong><span>{tool.desc}</span></button>)}
      </div>

      {error && <div className="error-card"><strong>工具调用失败</strong><p>{error}</p></div>}
      {result?.llmFallbackReason && <div className="permission-banner">已使用兜底结果：{result.llmFallbackReason}</div>}

      <div className="two-col wide-right">
        <section className="panel form-panel sticky-panel">
          <div className="panel-title compact"><span className="eyebrow">录入</span><h2>{activeMeta.name}</h2></div>
          <form className="form-stack" onSubmit={(e) => callTool(active, e)}>
            <div className="form-grid two">
              <label>学生称呼<input value={name} onChange={(e) => setName(e.target.value)} /></label>
              <label>CGPA / GPA<input value={cgpa} onChange={(e) => setCgpa(e.target.value)} /></label>
              <label>满分制<select value={scale} onChange={(e) => setScale(e.target.value)}><option value="4">4.0</option><option value="5">5.0</option><option value="100">100</option></select></label>
              <label>目标国家<select value={country} onChange={(e) => setCountry(e.target.value)}>{countryOptions.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
              <label>目标专业<select value={major} onChange={(e) => setMajor(e.target.value)}>{majorOptions.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
              <label>申请学位<select value={degree} onChange={(e) => setDegree(e.target.value)}>{degreeOptions.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
              <label>预算<select value={budget} onChange={(e) => setBudget(e.target.value)}>{budgetOptions.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
              <label>语言成绩<select value={language} onChange={(e) => setLanguage(e.target.value)}>{languageOptions.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
            </div>
            <label>项目 / 实习 / 课程经历<textarea value={experience} onChange={(e) => setExperience(e.target.value)} /></label>
            <label>主要顾虑<textarea value={concern} onChange={(e) => setConcern(e.target.value)} /></label>
            <div className="button-grid"><button className="primary" disabled={loading}>{loading ? '运行中...' : `运行：${activeMeta.name}`}</button><button className="ghost-button" type="button" disabled={loading} onClick={() => callTool('advisor')}>运行完整流程</button></div>
          </form>
        </section>

        <section className="panel result-panel">
          <div className="panel-title"><div><span className="eyebrow">结果</span><h2>{activeMeta.name}</h2></div>{result && <span className="pill success">完成</span>}</div>
          {result ? <><GenericResult result={result} active={active} /><details className="raw-json-details"><summary>查看结构化数据</summary><pre className="json-block">{JSON.stringify(result, null, 2)}</pre></details></> : <div className="empty-advice compact-empty"><div className="empty-icon">⌘</div><h2>选择工具并运行</h2><p>推荐先运行“适配评分”，再运行“完整流程”。</p></div>}
        </section>
      </div>
    </section>
  );
}
