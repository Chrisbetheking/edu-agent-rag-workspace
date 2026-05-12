import { FormEvent, ReactNode, useMemo, useState } from 'react';
import { api } from '../api/client';
import { asArray, downloadText, jsonMarkdown, stringifySafe } from '../utils/export';
import { buildLanguage, budgetOptions, countryOptions, degreeOptions, languageTypeOptions, majorOptions } from '../constants/options';
import { FoldSection, ListBlock, SectionNav, TextBlock, toDisplayText } from '../components/FoldSection';

type ToolKey = 'advisor' | 'score' | 'school' | 'application' | 'copywriting' | 'material';

const toolTabs: Array<{ key: ToolKey; name: string; tag: string; desc: string }> = [
  { key: 'advisor', name: '完整流程', tag: '编排', desc: '评分 → 选校 → 文书 → 跟进 → 材料' },
  { key: 'score', name: '适配评分', tag: '算法', desc: 'GPA、专业、项目、语言、预算' },
  { key: 'school', name: '选校分层', tag: '规划', desc: '冲刺 / 匹配 / 保底' },
  { key: 'application', name: '申请案卷', tag: '文书', desc: 'PS、CV、材料流程' },
  { key: 'copywriting', name: '销售跟进', tag: '转化', desc: '微信、电话、异议处理' },
  { key: 'material', name: '材料清单', tag: '规则', desc: '必交、条件、命名规范' },
];

function ResultCard({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return <FoldSection title={title} defaultOpen={defaultOpen}>{children}</FoldSection>;
}

function ScoreView({ result }: { result: any }) {
  return (
    <div className="agent-output-stack">
      <div className="agent-summary-card score-summary-card">
        <span className="eyebrow">适配评分算法</span>
        <h2>{result.overall ?? '-'}/100 · {result.band || '-'} 档</h2>
        <p>{toDisplayText(result.tierAdvice?.strategy) || '已完成背景适配度评估。'}</p>
        <div className="tag-row">
          <span>{toDisplayText(result.algorithm) || 'weighted-fit-v2'}</span>
          <span>成绩折算 {result.percentage ?? '-'}%</span>
        </div>
      </div>
      <div className="score-factor-grid large-score-grid">
        {asArray(result.factors).map((factor: any) => (
          <div className="score-factor" key={factor.key || factor.label}>
            <div><strong>{toDisplayText(factor.label)}</strong><em>{toDisplayText(factor.score)}</em></div>
            <div className="usage-bar"><i style={{ width: `${Math.max(8, Math.min(100, Number(factor.score || 0)))}%` }} /></div>
            <span>{toDisplayText(factor.evidence)}</span>
          </div>
        ))}
      </div>
      <div className="two-col">
        <ResultCard title="选校配比" defaultOpen><p>冲刺 {result.tierAdvice?.reach ?? '-'} 所，匹配 {result.tierAdvice?.match ?? '-'} 所，保底 {result.tierAdvice?.safe ?? '-'} 所。</p></ResultCard>
        <ResultCard title="风险点"><ListBlock items={result.risks} /></ResultCard>
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
    <div className="school-bands-grid compact-tier-grid">
      {bands.map(([title, items]: any) => (
        <FoldSection title={title} subtitle={`${asArray(items).length} 所`} key={title} defaultOpen={title !== '冲刺'}>
          <div className="school-list">
            {asArray(items).length ? asArray(items).map((school: any, index) => (
              <div className="school-row" key={school.name || index}>
                <strong>{toDisplayText(school.name || school)}</strong>
                {(school.reason || school.fit) && <p>{toDisplayText(school.reason || school.fit)}</p>}
                {school.risk && <small>风险：{toDisplayText(school.risk)}</small>}
                {school.action && <small>下一步：{toDisplayText(school.action)}</small>}
              </div>
            )) : <p className="muted">暂无推荐。</p>}
          </div>
        </FoldSection>
      ))}
      {!!asArray(data.risk).length && <FoldSection title="整体风险"><ListBlock items={data.risk} /></FoldSection>}
    </div>
  );
}

function MaterialView({ data }: { data: any }) {
  const groups = [
    ['必交材料', data.required],
    ['条件材料', data.conditional],
    ['补充材料', data.optional],
    ['命名规范', data.namingRules],
    ['时间节点', data.timeline],
    ['提醒', data.reminders],
  ].filter(([, items]) => asArray(items).length > 0);

  return (
    <div className="material-board">
      {groups.map(([title, items]) => (
        <FoldSection title={String(title)} key={String(title)} defaultOpen={String(title) === '必交材料'} badge={`${asArray(items).length} 项`}>
          <div className="material-list">
            {asArray(items).map((item, index) => {
              const label = typeof item === 'object' && item !== null
                ? (item as any).name || (item as any).item || (item as any).file || (item as any).stage || toDisplayText(item)
                : toDisplayText(item);
              const note = typeof item === 'object' && item !== null
                ? (item as any).note || (item as any).desc || (item as any).owner || (item as any).deadline || ''
                : '';
              return <div className="material-item" key={index}><strong>{toDisplayText(label)}</strong>{note && <span>{toDisplayText(note)}</span>}</div>;
            })}
          </div>
        </FoldSection>
      ))}
    </div>
  );
}

function ApplicationView({ result }: { result: any }) {
  return (
    <div className="agent-output-stack">
      <div className="ops-card-grid two-output-grid">
        <ResultCard title="PS 主题" defaultOpen><TextBlock value={result.writingBrief?.psTheme} /></ResultCard>
        <ResultCard title="CV 重点"><div className="tag-row">{asArray(result.writingBrief?.cvHighlights).map((x, i) => <span key={i}>{toDisplayText(x)}</span>)}</div></ResultCard>
      </div>
      <FoldSection title="PS 大纲" defaultOpen><ListBlock items={result.writingBrief?.psOutline} /></FoldSection>
      <FoldSection title="Personal Statement 初稿"><TextBlock value={result.drafts?.personalStatement} /></FoldSection>
      <FoldSection title="CV Summary"><TextBlock value={result.drafts?.cvSummary} /></FoldSection>
      <FoldSection title="推荐信角度"><ListBlock items={result.writingBrief?.recommendationAngles || result.drafts?.recommendationSeed} /></FoldSection>
      {!!asArray(result.pipeline).length && <FoldSection title="申请流程"><div className="pipeline-list">{asArray(result.pipeline).map((stage: any, index) => <div className="material-item" key={index}><strong>{toDisplayText(stage.stage || `阶段 ${index + 1}`)}</strong><span>{toDisplayText(stage.owner)} · {toDisplayText(stage.status)}</span><ListBlock items={stage.tasks} /></div>)}</div></FoldSection>}
    </div>
  );
}

function CopywritingView({ result }: { result: any }) {
  return (
    <div className="ops-card-grid two-output-grid">
      <ResultCard title="微信话术" defaultOpen><TextBlock value={result.wechat || result.wechatFollowup} /></ResultCard>
      <ResultCard title="电话提纲"><ListBlock items={result.callOutline} /></ResultCard>
      <ResultCard title="异议处理"><ListBlock items={result.objectionHandling} /></ResultCard>
      <ResultCard title="短视频脚本"><TextBlock value={result.shortVideoScript || result.videoScript} /></ResultCard>
      <ResultCard title="跟进动作"><div className="tag-row">{asArray(result.followUpTasks || result.wechatFollowup).map((x, i) => <span key={i}>{toDisplayText(x)}</span>)}</div></ResultCard>
    </div>
  );
}

function AdvisorView({ result }: { result: any }) {
  const outputs = result.outputs || {};
  return (
    <div className="agent-output-stack">
      <SectionNav items={[
        { id: 'advisor-trace', label: '链路' },
        { id: 'advisor-score', label: '评分' },
        { id: 'advisor-schools', label: '学校' },
        { id: 'advisor-application', label: '文书' },
        { id: 'advisor-sales', label: '跟进' },
        { id: 'advisor-materials', label: '材料' },
      ]} />
      <div className="agent-summary-card">
        <span className="eyebrow">完整流程</span>
        <h2>{toDisplayText(result.executiveSummary) || '已生成综合方案'}</h2>
        <div className="tag-row">
          <span>{toDisplayText(result.agentTrace?.mode) || 'algorithm-first'}</span>
          <span>{toDisplayText(result.agentTrace?.durationMs) || 0}ms</span>
          <span>{toDisplayText(result.agentTrace?.algorithm) || 'weighted-fit-v2'}</span>
          {outputs.fit && <span>评分 {outputs.fit.overall}/100</span>}
        </div>
      </div>

      <FoldSection id="advisor-trace" title="执行链路" subtitle="每个节点可单独查看" defaultOpen>
        <div className="workflow-list">
          {asArray(result.workflow).map((step: any, index) => (
            <div className="workflow-line" key={step.name || index}>
              <em>{step.step || index + 1}</em>
              <strong>{toDisplayText(step.name) || 'Step'}</strong>
              <span>{toDisplayText(step.tool) || '-'}</span>
              <p>{toDisplayText(step.output || step.status || 'done')}</p>
            </div>
          ))}
        </div>
      </FoldSection>

      {outputs.fit && <FoldSection id="advisor-score" title="适配评分" subtitle="算法权重和风险点" defaultOpen><ScoreView result={outputs.fit} /></FoldSection>}
      {outputs.schools && <FoldSection id="advisor-schools" title="选校分层" subtitle="冲刺 / 匹配 / 保底"><SchoolBands data={outputs.schools} /></FoldSection>}
      {outputs.application && <FoldSection id="advisor-application" title="申请案卷" subtitle="PS、CV、推荐信、流程"><ApplicationView result={outputs.application} /></FoldSection>}
      {outputs.sales && <FoldSection id="advisor-sales" title="销售跟进" subtitle="微信、电话、异议处理"><CopywritingView result={outputs.sales} /></FoldSection>}
      {outputs.materials && <FoldSection id="advisor-materials" title="材料清单" subtitle="必交、条件、命名"><MaterialView data={outputs.materials} /></FoldSection>}
    </div>
  );
}

function GenericResult({ result, active }: { result: any; active: ToolKey }) {
  if (active === 'advisor' && result.outputs) return <AdvisorView result={result} />;
  if (active === 'score' || result.algorithm?.startsWith?.('weighted-fit')) return <ScoreView result={result} />;
  if (active === 'school' || result.reach || result.match || result.safe) return <SchoolBands data={result} />;
  if (active === 'application' && result.writingBrief) return <ApplicationView result={result} />;
  if (active === 'copywriting') return <CopywritingView result={result} />;
  if (active === 'material') return <MaterialView data={result} />;
  return <pre className="json-block compact-json">{JSON.stringify(result || {}, null, 2)}</pre>;
}

export default function Tools() {
  const [active, setActive] = useState<ToolKey>('advisor');
  const [results, setResults] = useState<Partial<Record<ToolKey, any>>>({});
  const [loadingTool, setLoadingTool] = useState<ToolKey | null>(null);
  const [error, setError] = useState('');

  const [cgpa, setCgpa] = useState('3.2');
  const [scale, setScale] = useState('4');
  const [country, setCountry] = useState('英国');
  const [major, setMajor] = useState('计算机科学');
  const [budget, setBudget] = useState('30万人民币');
  const [languageType, setLanguageType] = useState('IELTS');
  const [languageScore, setLanguageScore] = useState('6.5');
  const [gaokaoTaken, setGaokaoTaken] = useState('否');
  const [gaokaoScore, setGaokaoScore] = useState('');
  const [name, setName] = useState('Chris');
  const [concern, setConcern] = useState('担心 CGPA 不够，希望用项目经历提升竞争力');
  const [degree, setDegree] = useState('硕士');
  const [experience, setExperience] = useState('马来西亚 APU 计算机本科，有软件项目、AI/数据项目、实习和 GitHub 作品集');

  const activeMeta = useMemo(() => toolTabs.find((item) => item.key === active) || toolTabs[0], [active]);
  const activeResult = results[active];
  const language = useMemo(() => buildLanguage(languageType, languageScore), [languageType, languageScore]);
  const payload = useMemo(() => ({
    cgpa: Number(cgpa), gpa: cgpa, scale: Number(scale), country, targetCountry: country, major, budget,
    language, languageType, languageScore, englishScore: language, gaokaoTaken, gaokaoScore,
    name, studentName: name, concern, angle: concern, degree, experience, background: experience, student: experience,
    platform: '小红书 + 微信私域'
  }), [cgpa, scale, country, major, budget, language, languageType, languageScore, gaokaoTaken, gaokaoScore, name, concern, degree, experience]);

  function endpointFor(type: ToolKey) {
    if (type === 'score') return '/tools/profile-fit';
    if (type === 'school') return '/tools/school-recommend';
    if (type === 'copywriting') return '/tools/copywriting';
    if (type === 'application') return '/tools/application-plan';
    if (type === 'advisor') return '/tools/advisor-suite';
    return '/tools/material-list';
  }

  async function logClientError(type: ToolKey, err: any, started: number) {
    try {
      await api.post('/tools/client-error-log', {
        toolName: toolTabs.find((item) => item.key === type)?.name || type,
        activeTool: type,
        endpoint: endpointFor(type),
        message: err?.response?.data?.message || err?.message || '工具调用失败',
        durationMs: Date.now() - started,
      });
    } catch {
      // ignore
    }
  }

  async function callTool(type: ToolKey, e?: FormEvent) {
    e?.preventDefault();
    const started = Date.now();
    setActive(type);
    setLoadingTool(type);
    setError('');
    try {
      const { data } = await api.post(endpointFor(type), payload);
      setResults((prev) => {
        const next: Partial<Record<ToolKey, any>> = { ...prev, [type]: data || {} };
        if (type === 'advisor' && data?.outputs) {
          next.score = data.outputs.fit || next.score;
          next.school = data.outputs.schools || next.school;
          next.application = data.outputs.application || next.application;
          next.copywriting = data.outputs.sales || next.copywriting;
          next.material = data.outputs.materials || next.material;
        }
        return next;
      });
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || '工具调用失败';
      setError(message);
      await logClientError(type, err, started);
    } finally { setLoadingTool(null); }
  }

  const exportText = activeResult?.exportMarkdown || jsonMarkdown(`${activeMeta.name}结果`, activeResult || {});
  const isLoading = loadingTool === active;

  return (
    <section className="page-stack compact-page">
      <div className="page-title elevated clean-title">
        <div><span className="eyebrow">方案引擎</span><h1>评分与工具编排</h1><p>先运行完整流程，也可以单独查看每个节点的结果。</p></div>
        <div className="title-actions">
          {activeResult && <button className="ghost-button" onClick={() => downloadText(`tool-${active}.md`, exportText)}>导出 Markdown</button>}
          {activeResult && <button className="ghost-button" onClick={() => downloadText(`tool-${active}.json`, JSON.stringify(activeResult, null, 2), 'application/json;charset=utf-8')}>导出 JSON</button>}
        </div>
      </div>

      <div className="tool-tabs pro-tabs compact-tabs">
        {toolTabs.map((tool) => <button className={active === tool.key ? 'tab active' : 'tab'} key={tool.key} onClick={() => setActive(tool.key)} type="button"><em>{tool.tag}</em><strong>{tool.name}</strong><span>{tool.desc}</span>{results[tool.key] && <b className="tab-done">已生成</b>}</button>)}
      </div>

      {error && <div className="error-card"><strong>工具调用失败</strong><p>{error}</p><small>已写入前端失败日志；如果仍看不到，请确认后端已部署本次补丁。</small></div>}
      {activeResult?.llmFallbackReason && <div className="permission-banner">已使用兜底结果：{toDisplayText(activeResult.llmFallbackReason)}</div>}

      <div className="two-col wide-right">
        <section className="panel form-panel sticky-panel">
          <div className="panel-title compact"><span className="eyebrow">录入</span><h2>{activeMeta.name}</h2></div>
          <form className="form-stack" onSubmit={(e) => callTool(active, e)}>
            <div className="form-grid two">
              <label>学生称呼<input value={name} onChange={(e) => setName(e.target.value)} /></label>
              <label>申请学位<select value={degree} onChange={(e) => setDegree(e.target.value)}>{degreeOptions.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
              <label>GPA / CGPA<input value={cgpa} onChange={(e) => setCgpa(e.target.value)} /></label>
              <label>满分制<select value={scale} onChange={(e) => setScale(e.target.value)}><option value="4">4.0</option><option value="5">5.0</option><option value="100">100</option></select></label>
              <label>目标国家<select value={country} onChange={(e) => setCountry(e.target.value)}>{countryOptions.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
              <label>目标专业<select value={major} onChange={(e) => setMajor(e.target.value)}>{majorOptions.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
              <label>语言类型<select value={languageType} onChange={(e) => setLanguageType(e.target.value)}>{languageTypeOptions.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
              <label>语言分数<input value={languageScore} onChange={(e) => setLanguageScore(e.target.value)} placeholder="例如 6.5 / 90 / 65" disabled={languageType === '暂无'} /></label>
              {degree === '本科' && <label>是否有高考成绩<select value={gaokaoTaken} onChange={(e) => setGaokaoTaken(e.target.value)}><option value="否">否</option><option value="是">是</option></select></label>}
              {degree === '本科' && gaokaoTaken === '是' && <label>高考分数<input value={gaokaoScore} onChange={(e) => setGaokaoScore(e.target.value)} placeholder="例如 580/750" /></label>}
              <label>预算<select value={budget} onChange={(e) => setBudget(e.target.value)}>{budgetOptions.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
            </div>
            <label>项目 / 实习 / 课程经历<textarea value={experience} onChange={(e) => setExperience(e.target.value)} /></label>
            <label>主要顾虑<textarea value={concern} onChange={(e) => setConcern(e.target.value)} /></label>
            <div className="button-grid"><button className="primary" type="button" disabled={!!loadingTool} onClick={() => callTool('advisor')}>{loadingTool === 'advisor' ? '运行中...' : '运行完整流程'}</button><button className="ghost-button" disabled={!!loadingTool}>{isLoading ? '运行中...' : `运行：${activeMeta.name}`}</button></div>
          </form>
        </section>

        <section className="panel result-panel">
          <div className="panel-title"><div><span className="eyebrow">结果</span><h2>{activeMeta.name}</h2></div>{activeResult && <span className="pill success">完成</span>}</div>
          {activeResult ? <><GenericResult result={activeResult} active={active} /><details className="raw-json-details"><summary>查看结构化数据</summary><pre className="json-block compact-json">{JSON.stringify(activeResult, null, 2)}</pre></details></> : <div className="empty-advice compact-empty"><div className="empty-icon">⌘</div><h2>{loadingTool ? '正在运行' : '等待运行'}</h2><p>建议先运行“完整流程”，再查看各节点结果。</p></div>}
        </section>
      </div>
    </section>
  );
}
