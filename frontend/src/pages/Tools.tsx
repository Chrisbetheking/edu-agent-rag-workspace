import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { api, AI_LOADING_HINT, explainApiFailure, humanizeFallbackReason } from '../api/client';
import { asArray, downloadText, jsonMarkdown } from '../utils/export';
import { buildLanguage, budgetOptions, countryOptions, degreeOptions, languageTypeOptions, majorOptions } from '../constants/options';
import { CompactMetric, FoldSection, ListBlock, ResultShell, SectionGroup, SectionNav, TextBlock, toDisplayText } from '../components/FoldSection';
import { readSessionState, writeSessionState } from '../utils/sessionState';

type ToolKey = 'advisor' | 'score' | 'school' | 'application' | 'copywriting' | 'material';

const STORAGE_KEY = 'eduagent.tools.v10';

const toolTabs: Array<{ key: ToolKey; name: string; tag: string; desc: string }> = [
  { key: 'advisor', name: '完整流程', tag: '编排', desc: '评分 → 选校 → 文书 → 跟进 → 材料' },
  { key: 'score', name: '适配评分', tag: '算法', desc: '权重、风险、建议配比' },
  { key: 'school', name: '选校分层', tag: '规划', desc: '冲刺 / 匹配 / 保底' },
  { key: 'application', name: '申请案卷', tag: '文书', desc: 'PS、CV、流程' },
  { key: 'copywriting', name: '销售跟进', tag: '转化', desc: '微信、电话、异议' },
  { key: 'material', name: '材料清单', tag: '规则', desc: '必交、条件、命名' },
];

const toolPresets = [
  {
    label: 'Chris｜APU 计算机', name: 'Chris', degree: '硕士', cgpa: '3.2', scale: '4', country: '英国', major: '计算机科学',
    budget: '30万人民币', languageType: 'IELTS', languageScore: '6.5',
    experience: '马来西亚 APU 计算机本科，有软件项目、AI/数据项目、实习和 GitHub 作品集。',
    concern: 'GPA 不算高，但项目经历可以补强，语言成绩还需要提升。',
  },
  {
    label: '双非｜均分85', name: '学生A', degree: '硕士', cgpa: '85', scale: '100', country: '英国', major: '人工智能',
    budget: '35万人民币', languageType: 'IELTS', languageScore: '6.5',
    experience: '双非一本计算机相关专业，均分85，有机器学习课程项目、Web 全栈项目和一段实习。',
    concern: '希望冲一部分排名更高的学校，同时保证匹配和保底选择。',
  },
  {
    label: '澳洲｜数据科学', name: '学生B', degree: '硕士', cgpa: '3.5', scale: '4', country: '澳洲', major: '数据科学',
    budget: '40万人民币', languageType: 'IELTS', languageScore: '6.5',
    experience: '软件工程本科，GPA 3.5/4.0，有 Python 数据分析、数据库、云部署和实习经历。',
    concern: '想从软件工程转数据科学，担心课程匹配度和预算。',
  },
];

function safeList(...values: unknown[]) {
  return values.flatMap((value) => asArray(value)).filter(Boolean);
}

function uniqueList(...values: unknown[]) {
  return Array.from(new Set(safeList(...values).map((item) => toDisplayText(item)).filter(Boolean)));
}

function MiniCard({ title, children, subtitle, className = '' }: { title: string; subtitle?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`mini-result-card ${className}`.trim()}>
      <div className="mini-result-head">
        <strong>{title}</strong>
        {subtitle && <span>{subtitle}</span>}
      </div>
      <div className="mini-result-body">{children}</div>
    </div>
  );
}

function CopyButton({ text }: { text: unknown }) {
  return <button className="mini-copy" type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigator.clipboard?.writeText(toDisplayText(text)); }}>复制</button>;
}

function ResultCard({ title, children, subtitle, className = '' }: { title: string; children: ReactNode; subtitle?: string; className?: string }) {
  return <FoldSection title={title} subtitle={subtitle} defaultOpen className={`inner-fold-card ${className}`.trim()}>{children}</FoldSection>;
}

function TextPanel({ title, value, className = '' }: { title: string; value: unknown; className?: string }) {
  return (
    <FoldSection title={title} defaultOpen className={`inner-fold-card ${className}`.trim()} badge={<CopyButton text={value} />}>
      <TextBlock value={value} />
    </FoldSection>
  );
}


function ScoreView({ result, id = 'score-detail' }: { result: any; id?: string }) {
  const risks = uniqueList(result.hardRisks, result.softRisks, result.risks, result.riskSignals, result.riskFlags);
  const hardRisks = uniqueList(result.hardRisks);
  const softRisks = uniqueList(result.softRisks, result.riskSignals).filter((item) => !hardRisks.includes(item));
  const nextActions = uniqueList(result.nextActions, result.nextBestActions);
  const factors = asArray(result.factors);
  const tier = result.tierAdvice || {};

  return (
    <div className="agent-output-stack generated-output score-output-v15 score-output-v16">
      <ResultShell id={id} title="适配评分" subtitle="算法结论、评分证据和风险点">
        <div className="score-board-v15">
          <div className="score-hero-v15">
            <span className="eyebrow">weighted-fit-v2</span>
            <strong>{result.overall ?? '-'}/100</strong>
            <p>{result.band || '-'} 档 · {toDisplayText(tier.strategy) || '完成内部初筛'}</p>
            <div className="score-mini-grid-v15">
              <span><b>{hardRisks.length}</b><em>硬风险</em></span>
              <span><b>{softRisks.length || risks.length}</b><em>待确认</em></span>
              <span><b>{tier.reach ?? '-'}/{tier.match ?? '-'}/{tier.safe ?? '-'}</b><em>冲/匹/保</em></span>
            </div>
          </div>
          <div className="score-factors-v15">
            {factors.map((factor: any) => (
              <div className="score-factor-v15" key={factor.key || factor.label}>
                <div><strong>{toDisplayText(factor.label)}</strong><b>{toDisplayText(factor.score)}</b></div>
                <div className="usage-bar"><i style={{ width: `${Math.max(8, Math.min(100, Number(factor.score || 0)))}%` }} /></div>
                <p>{toDisplayText(factor.evidence)}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="risk-action-grid-v15">
          <MiniCard title="硬风险" subtitle="优先处理"><ListBlock items={hardRisks.length ? hardRisks : ['暂无硬风险，仍需逐校核对官网要求。']} /></MiniCard>
          <MiniCard title="待人工确认" subtitle="官网 / 预算 / 材料"><ListBlock items={softRisks.length ? softRisks : risks} /></MiniCard>
          <MiniCard title="下一步动作" subtitle="按优先级推进"><ListBlock items={nextActions} /></MiniCard>
        </div>
      </ResultShell>
    </div>
  );
}

function SchoolBands({ data, id = 'schools' }: { data: any; id?: string }) {
  const bands = [
    ['冲刺', data.reach, '高目标，保留机会但控制数量'],
    ['匹配', data.match, '主申请区间，重点核对课程匹配'],
    ['保底', data.safe, '控制风险，保证方案完整性'],
  ];
  const total = bands.reduce((sum, [, items]: any) => sum + asArray(items).length, 0);
  return (
    <ResultShell id={id} title="三档选校" subtitle="候选学校横向展示，便于对比">
      <div className="school-board-v15 school-board-v16">
        <div className="school-summary-v15">
          <span>候选学校</span>
          <strong>{total}</strong>
          <p>每档先保留候选，最终名单需要核对官网要求、预算和申请截止时间。</p>
        </div>
        {bands.map(([title, items, desc]: any) => (
          <FoldSection title={title} subtitle={`${asArray(items).length} 所 · ${desc}`} key={title} defaultOpen className="inner-fold-card school-band-v15">
            <div className="school-card-list-v15">
              {asArray(items).length ? asArray(items).map((school: any, index) => (
                <div className="school-row-v15" key={school.name || index}>
                  <strong>{`${school.rank ? `${school.rank}. ` : ''}${toDisplayText([school.nameZh, school.nameEn].filter(Boolean).join(' / ') || school.name || school)}`}</strong>
                  {(school.major || school.majorZh || school.majorEn) && <small>推荐专业：{toDisplayText(school.major || [school.majorZh, school.majorEn].filter(Boolean).join(' / '))}</small>}
                  {school.successRate && <small>初筛成功率：{toDisplayText(school.successRate)}</small>}
                  {(school.reason || school.fit) && <p>{toDisplayText(school.reason || school.fit)}</p>}
                  {school.risk && <small>风险：{toDisplayText(school.risk)}</small>}
                  {school.action && <small>下一步：{toDisplayText(school.action)}</small>}
                </div>
              )) : <p className="muted">暂无推荐。</p>}
            </div>
          </FoldSection>
        ))}
      </div>
      {!!asArray(data.risk).length && <FoldSection title="整体风险" defaultOpen className="inner-fold-card"><ListBlock items={data.risk} /></FoldSection>}
    </ResultShell>
  );
}

function MaterialView({ data, id = 'materials' }: { data: any; id?: string }) {
  const groups = [
    ['必交材料', data.required],
    ['条件材料', data.conditional],
    ['补充材料', data.optional],
    ['命名规范', data.namingRules],
    ['时间节点', data.timeline],
    ['提醒', data.reminders],
  ].filter(([, items]) => asArray(items).length > 0);

  return (
    <ResultShell id={id} title="材料清单" subtitle="按递交优先级分组">
      <div className="material-board-v15 material-board-v16">
        {groups.map(([title, items]) => (
          <FoldSection title={String(title)} key={String(title)} defaultOpen badge={`${asArray(items).length} 项`} className="inner-fold-card material-group-v15">
            <div className="material-list-v15">
              {asArray(items).map((item, index) => {
                const label = typeof item === 'object' && item !== null
                  ? (item as any).name || (item as any).item || (item as any).file || (item as any).stage || toDisplayText(item)
                  : toDisplayText(item);
                const note = typeof item === 'object' && item !== null
                  ? (item as any).note || (item as any).desc || (item as any).owner || (item as any).deadline || ''
                  : '';
                return <div className="material-item-v15" key={index}><strong>{toDisplayText(label)}</strong>{note && <span>{toDisplayText(note)}</span>}</div>;
              })}
            </div>
          </FoldSection>
        ))}
      </div>
    </ResultShell>
  );
}

function ApplicationView({ result, id = 'application-brief' }: { result: any; id?: string }) {
  const pipeline = asArray(result.pipeline);
  const risks = safeList(result.riskFlags, result.risks);
  const actions = safeList(result.nextBestActions, result.nextActions);
  return (
    <div className="agent-output-stack generated-output application-output-v15">
      <ResultShell id={id} title="申请案卷" subtitle="文书方向、执行流程和材料">
        <div className="app-brief-grid-v15 app-brief-grid-v16">
          <TextPanel title="PS 主题" value={result.writingBrief?.psTheme} />
          <ResultCard title="PS 大纲"><ListBlock items={result.writingBrief?.psOutline} /></ResultCard>
          <ResultCard title="CV 重点"><div className="tag-row tag-row-readable-v15">{asArray(result.writingBrief?.cvHighlights).map((x, i) => <span key={i}>{toDisplayText(x)}</span>)}</div></ResultCard>
          <ResultCard title="推荐信角度"><ListBlock items={result.writingBrief?.recommendationAngles} /></ResultCard>
        </div>
      </ResultShell>

      <ResultShell id="application-drafts" title="可编辑初稿" subtitle="长文独占左侧，摘要在右侧">
        <div className="draft-board-v15">
          <TextPanel title="Personal Statement 初稿" value={result.drafts?.personalStatement} className="draft-main-card" />
          <div className="draft-side-v15">
            <TextPanel title="CV Summary" value={result.drafts?.cvSummary} />
            <TextPanel title="推荐信素材" value={result.drafts?.recommendationSeed} />
          </div>
        </div>
      </ResultShell>

      <ResultShell title="申请执行" subtitle="按任务节点推进">
        <div className="pipeline-board-v15 pipeline-board-v16">{pipeline.map((stage: any, index) => <FoldSection title={`${index + 1}. ${toDisplayText(stage.stage || stage.name || '任务')}`} subtitle={toDisplayText(stage.owner)} badge={toDisplayText(stage.status || '待开始')} key={index} defaultOpen className="inner-fold-card stage-card-readable-v15"><ListBlock items={stage.tasks || stage.items || stage.action} /></FoldSection>)}</div>
      </ResultShell>
      <ResultShell title="风险与下一步" subtitle="人工确认">
        <div className="risk-action-grid-v15 risk-action-grid-v16 two-only">
          <MiniCard title="风险点"><ListBlock items={risks} /></MiniCard>
          <MiniCard title="下一步"><ListBlock items={actions} /></MiniCard>
        </div>
      </ResultShell>
    </div>
  );
}

function CopywritingView({ result, id = 'sales' }: { result: any; id?: string }) {
  return (
    <ResultShell id={id} title="销售跟进" subtitle="微信、电话、异议处理">
      <div className="sales-board-v15 sales-board-v16">
        <TextPanel title="微信跟进" value={result.wechat} />
        <TextPanel title="短视频脚本" value={result.shortVideoScript || result.videoScript} />
        <ResultCard title="异议处理"><ListBlock items={result.objectionHandling} /></ResultCard>
        <ResultCard title="电话提纲"><ListBlock items={result.callOutline} /></ResultCard>
        <ResultCard title="跟进任务"><ListBlock items={result.followUpTasks} /></ResultCard>
      </div>
    </ResultShell>
  );
}

function AdvisorView({ result }: { result: any }) {
  const outputs = result.outputs || {};
  const risks = safeList(outputs.fit?.risks, outputs.fit?.riskSignals, outputs.application?.riskFlags);
  return (
    <div className="agent-output-stack generated-output advisor-output-v15 advisor-output-v16 advisor-output-v17">
      <SectionNav items={[
        { id: 'advisor-trace', label: '链路' },
        { id: 'advisor-score', label: '评分' },
        { id: 'advisor-schools', label: '学校' },
        { id: 'advisor-application', label: '文书' },
        { id: 'advisor-sales', label: '跟进' },
        { id: 'advisor-materials', label: '材料' },
      ]} />
      <div className="agent-summary-card advisor-hero-card compact-advisor-hero">
        <span className="eyebrow">完整流程已生成</span>
        <h2>{toDisplayText(result.executiveSummary) || '已生成综合方案'}</h2>
        <div className="tag-row">
          <span>{toDisplayText(result.agentTrace?.mode) || 'algorithm-first'}</span>
          <span>{toDisplayText(result.agentTrace?.algorithm) || 'weighted-fit-v2'}</span>
          {outputs.fit && <span>评分 {outputs.fit.overall}/100</span>}
          <span>风险 {risks.length}</span>
        </div>
      </div>

      <ResultShell id="advisor-trace" title="执行链路" subtitle="一次录入，多节点复用">
        <div className="workflow-board-v15">
          {asArray(result.workflow).map((step: any, index) => (
            <MiniCard key={step.name || index} title={`${step.step || index + 1}. ${toDisplayText(step.name) || 'Step'}`} subtitle={toDisplayText(step.tool) || '-'}>
              <p>{toDisplayText(step.output || step.status || 'done')}</p>
            </MiniCard>
          ))}
        </div>
      </ResultShell>

      {outputs.fit && <ScoreView result={outputs.fit} id="advisor-score" />}
      {outputs.schools && <SchoolBands data={outputs.schools} id="advisor-schools" />}
      {outputs.application && <ApplicationView result={outputs.application} id="advisor-application" />}
      {outputs.sales && <CopywritingView result={outputs.sales} id="advisor-sales" />}
      {outputs.materials && <MaterialView data={outputs.materials} id="advisor-materials" />}
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
  const [hydrated, setHydrated] = useState(false);
  const [active, setActive] = useState<ToolKey>('advisor');
  const [results, setResults] = useState<Partial<Record<ToolKey, any>>>({});
  const [loadingTool, setLoadingTool] = useState<ToolKey | null>(null);
  const [error, setError] = useState('');

  const [cgpa, setCgpa] = useState('');
  const [scale, setScale] = useState('');
  const [country, setCountry] = useState('');
  const [major, setMajor] = useState('');
  const [budget, setBudget] = useState('');
  const [languageType, setLanguageType] = useState('');
  const [languageScore, setLanguageScore] = useState('');
  const [gaokaoTaken, setGaokaoTaken] = useState('否');
  const [gaokaoScore, setGaokaoScore] = useState('');
  const [name, setName] = useState('');
  const [concern, setConcern] = useState('');
  const [degree, setDegree] = useState('');
  const [experience, setExperience] = useState('');

  useEffect(() => {
    const saved = readSessionState<any>(STORAGE_KEY, {});
    if (saved.active) setActive(saved.active);
    if (saved.results) setResults(saved.results);
    if (saved.form) {
      setCgpa(saved.form.cgpa ?? ''); setScale(saved.form.scale ?? ''); setCountry(saved.form.country ?? ''); setMajor(saved.form.major ?? '');
      setBudget(saved.form.budget ?? ''); setLanguageType(saved.form.languageType ?? ''); setLanguageScore(saved.form.languageScore ?? '');
      setGaokaoTaken(saved.form.gaokaoTaken ?? '否'); setGaokaoScore(saved.form.gaokaoScore ?? ''); setName(saved.form.name ?? '');
      setConcern(saved.form.concern ?? ''); setDegree(saved.form.degree ?? '');
      setExperience(saved.form.experience ?? '');
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeSessionState(STORAGE_KEY, { active, results, form: { cgpa, scale, country, major, budget, languageType, languageScore, gaokaoTaken, gaokaoScore, name, concern, degree, experience } });
  }, [hydrated, active, results, cgpa, scale, country, major, budget, languageType, languageScore, gaokaoTaken, gaokaoScore, name, concern, degree, experience]);

  const activeMeta = useMemo(() => toolTabs.find((item) => item.key === active) || toolTabs[0], [active]);
  const activeResult = results[active];
  const language = useMemo(() => buildLanguage(languageType, languageScore), [languageType, languageScore]);
  const payload = useMemo(() => ({
    cgpa: Number(cgpa), gpa: cgpa, scale: Number(scale), country, targetCountry: country, major, budget,
    language, languageType, languageScore, englishScore: language, gaokaoTaken, gaokaoScore,
    name, studentName: name, concern, angle: concern, degree, experience, background: experience, student: experience,
    platform: '小红书 + 微信私域'
  }), [cgpa, scale, country, major, budget, language, languageType, languageScore, gaokaoTaken, gaokaoScore, name, concern, degree, experience]);


  function applyPreset(preset: any) {
    setName(preset.name || ''); setDegree(preset.degree || ''); setCgpa(preset.cgpa || ''); setScale(preset.scale || '');
    setCountry(preset.country || ''); setMajor(preset.major || ''); setBudget(preset.budget || '');
    setLanguageType(preset.languageType || ''); setLanguageScore(preset.languageScore || '');
    setExperience(preset.experience || ''); setConcern(preset.concern || '');
  }

  function clearWorkspace() {
    setCgpa(''); setScale(''); setCountry(''); setMajor(''); setBudget(''); setLanguageType(''); setLanguageScore('');
    setGaokaoTaken('否'); setGaokaoScore(''); setName(''); setConcern(''); setDegree(''); setExperience('');
    setResults({}); writeSessionState(STORAGE_KEY, { active, results: {}, form: {} });
  }

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
    } catch {}
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
        writeSessionState(STORAGE_KEY, { active: type, results: next, form: { cgpa, scale, country, major, budget, languageType, languageScore, gaokaoTaken, gaokaoScore, name, concern, degree, experience } });
        return next;
      });
      window.setTimeout(() => document.querySelector('.result-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || '工具调用失败';
      setError(`${message}。${explainApiFailure(message)}`);
      await logClientError(type, err, started);
    } finally { setLoadingTool(null); }
  }

  const exportText = activeResult?.exportMarkdown || jsonMarkdown(`${activeMeta.name}结果`, activeResult || {});
  const isLoading = loadingTool === active;

  return (
    <section className="page-stack compact-page tools-page-v9 tools-page-v15">
      <div className="page-title elevated clean-title">
        <div><span className="eyebrow">方案引擎</span><h1>评分与工具编排</h1><p>把学生画像放进来，先出评分和三档学校，再拆文书、话术和材料清单。</p></div>
        <div className="title-actions">
          {activeResult && <button className="ghost-button" onClick={() => downloadText(`tool-${active}.md`, exportText)}>导出 Markdown</button>}
          {activeResult && <button className="ghost-button" onClick={() => downloadText(`tool-${active}.json`, JSON.stringify(activeResult, null, 2), 'application/json;charset=utf-8')}>导出 JSON</button>}
        </div>
      </div>

      <div className="tool-tabs pro-tabs compact-tabs tool-tabs-v9">
        {toolTabs.map((tool) => <button className={active === tool.key ? 'tab active' : 'tab'} key={tool.key} onClick={() => setActive(tool.key)} type="button"><em>{tool.tag}</em><strong>{tool.name}</strong><span>{tool.desc}</span>{results[tool.key] && <b className="tab-done">已生成</b>}</button>)}
      </div>

      {error && <div className="error-card"><strong>工具调用失败</strong><p>{error}</p><small>已尝试写入前端失败日志；如系统日志没有出现，请重新部署后端。</small></div>}
      {activeResult?.llmFallbackReason && <div className="permission-banner">{humanizeFallbackReason(activeResult.llmFallbackReason)}</div>}

      <div className={`two-col wide-right tools-workbench-grid tools-workbench-v9 tools-workbench-v13 tools-workbench-v15 tools-workbench-v17 ${activeResult ? 'with-result generated' : ''}`}>
        <section className={`panel form-panel compact-form-card ${activeResult ? 'form-panel-inline' : 'sticky-panel'}`}>
          <div className="panel-title compact form-action-title">
            <div><span className="eyebrow">录入</span><h2>{activeMeta.name}</h2></div>
            <div className="inline-actions"><button className="ghost-button" type="button" onClick={clearWorkspace}>清空</button>
            <button className="primary compact-run-button" type="button" disabled={!!loadingTool} onClick={() => callTool(active)}>
              {isLoading ? 'AI 处理中…' : active === 'advisor' ? '运行完整流程' : `运行${activeMeta.name}`}
            </button></div>
          </div>
          <form className="form-stack" onSubmit={(e) => callTool(active, e)}>
            <div className="form-grid two">
              <label>学生称呼<input value={name} onChange={(e) => setName(e.target.value)} /></label>
              <label>申请学位<select value={degree} onChange={(e) => setDegree(e.target.value)}><option value="">请选择</option>{degreeOptions.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
              <label>GPA / CGPA<input value={cgpa} onChange={(e) => setCgpa(e.target.value)} /></label>
              <label>满分制<select value={scale} onChange={(e) => setScale(e.target.value)}><option value="">请选择</option><option value="4">4.0</option><option value="5">5.0</option><option value="100">100</option></select></label>
              <label>目标国家<select value={country} onChange={(e) => setCountry(e.target.value)}><option value="">请选择</option>{countryOptions.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
              <label>目标专业<select value={major} onChange={(e) => setMajor(e.target.value)}><option value="">请选择</option>{majorOptions.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
              <label>语言类型<select value={languageType} onChange={(e) => setLanguageType(e.target.value)}><option value="">请选择</option>{languageTypeOptions.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
              <label>语言分数<input value={languageScore} onChange={(e) => setLanguageScore(e.target.value)} placeholder="例如 6.5 / 90 / 65" disabled={languageType === '暂无'} /></label>
              {degree === '本科' && <label>是否有高考成绩<select value={gaokaoTaken} onChange={(e) => setGaokaoTaken(e.target.value)}><option value="否">否</option><option value="是">是</option></select></label>}
              {degree === '本科' && gaokaoTaken === '是' && <label>高考分数<input value={gaokaoScore} onChange={(e) => setGaokaoScore(e.target.value)} placeholder="例如 580/750" /></label>}
              <label>预算<select value={budget} onChange={(e) => setBudget(e.target.value)}><option value="">请选择</option>{budgetOptions.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
            </div>
            <label>项目 / 实习 / 课程经历<textarea value={experience} onChange={(e) => setExperience(e.target.value)} /></label>
            <label>主要顾虑<textarea value={concern} onChange={(e) => setConcern(e.target.value)} placeholder="例如：GPA 不够高 / 预算有限 / 想转专业 / 缺少项目" /></label>
            <div className="quick-fill-panel"><strong>快速填写</strong><div className="example-row">{toolPresets.map((preset) => <button type="button" key={preset.label} onClick={() => applyPreset(preset)}>{preset.label}</button>)}</div></div>
            {loadingTool && <p className="muted-text">{AI_LOADING_HINT}</p>}
          </form>
        </section>

        <section className="panel result-panel generated-result-panel result-panel-v9 result-panel-v13 result-panel-v15 result-panel-v17">
          <div className="panel-title"><div><span className="eyebrow">结果</span><h2>{activeMeta.name}</h2></div>{activeResult && <span className="pill success">完成</span>}</div>
          {activeResult ? <><GenericResult result={activeResult} active={active} /><details className="raw-json-details"><summary>查看结构化数据</summary><pre className="json-block compact-json">{JSON.stringify(activeResult, null, 2)}</pre></details></> : <div className="empty-advice compact-empty"><div className="empty-icon">⌘</div><h2>{loadingTool ? '正在处理' : '等待运行'}</h2><p>{loadingTool ? AI_LOADING_HINT : '建议先运行“完整流程”，再查看各节点结果。'}</p></div>}
        </section>
      </div>
    </section>
  );
}
