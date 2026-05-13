import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { asArray, downloadText, stringifySafe } from '../utils/export';
import { buildLanguage, budgetOptions, countryOptions, degreeOptions, languageTypeOptions, majorOptions } from '../constants/options';
import { CompactMetric, FoldSection, ListBlock, ResultShell, SectionGroup, SectionNav, TextBlock, toDisplayText } from '../components/FoldSection';
import { readSessionState, writeSessionState } from '../utils/sessionState';

const STORAGE_KEY = 'eduagent.applications.v9';

const defaultStages = [
  { stage: '背景确认', owner: '咨询顾问', tasks: ['确认目标国家、专业、预算', '收集成绩单和语言成绩'] },
  { stage: '选校定位', owner: '申请顾问', tasks: ['拆分冲刺、匹配、保底', '逐校核对官网要求'] },
  { stage: '材料准备', owner: '学生 + 顾问', tasks: ['补齐护照、成绩单、在读证明', '整理项目、实习和作品集'] },
  { stage: '文书制作', owner: '文书顾问', tasks: ['确定 PS 主线', '优化 CV 和推荐信素材'] },
  { stage: '网申递交', owner: '申请顾问', tasks: ['创建网申账号', '上传材料并核对文件命名'] },
  { stage: 'Offer 跟进', owner: '顾问 + 学生', tasks: ['跟进补件', '比较录取、押金和住宿'] },
];

function normalizeStage(stage: any, index: number) {
  const base = defaultStages[index] || defaultStages[defaultStages.length - 1];
  const title = !stage?.stage || stage.stage === '申请阶段' ? base.stage : stage.stage;
  return {
    ...base,
    ...stage,
    stage: title,
    owner: stage?.owner || base.owner,
    tasks: asArray(stage?.tasks).length ? asArray(stage.tasks) : base.tasks,
    status: stage?.status || (index === 0 ? '进行中' : '待开始'),
  };
}

function StageCard({ stage, index }: { stage: any; index: number }) {
  const item = normalizeStage(stage, index);
  return (
    <FoldSection title={`${index + 1}. ${item.stage}`} subtitle={item.owner} badge={item.status} defaultOpen className="inner-fold-card stage-card-v9">
      <ListBlock items={item.tasks} />
    </FoldSection>
  );
}

function CopyButton({ text }: { text: unknown }) {
  return <button className="mini-copy" type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigator.clipboard?.writeText(toDisplayText(text)); }}>复制</button>;
}

function TextPanel({ title, content, className = '' }: { title: string; content: unknown; className?: string }) {
  const text = toDisplayText(content);
  return (
    <FoldSection title={title} defaultOpen className={`inner-fold-card ${className}`.trim()} badge={<CopyButton text={text} />}>
      <TextBlock value={text || '暂无内容'} />
    </FoldSection>
  );
}

function ScorePanel({ fit }: { fit: any }) {
  if (!fit) return null;
  const risks = [...asArray(fit.risks), ...asArray(fit.riskSignals), ...asArray(fit.riskFlags)];
  const nextActions = [...asArray(fit.nextActions), ...asArray(fit.nextBestActions)];
  const aside = (
    <div className="score-aside-card">
      <span className="eyebrow">weighted-fit-v2</span>
      <h2>{fit.overall}/100</h2>
      <p>{fit.band} 档 · {toDisplayText(fit.tierAdvice?.strategy)}</p>
      <div className="compact-metric-grid two">
        <CompactMetric label="风险" value={risks.length} />
        <CompactMetric label="动作" value={nextActions.length} />
      </div>
    </div>
  );
  return (
    <ResultShell id="app-score" title="申请适配度" subtitle="算法评分、证据和配比" aside={aside}>
      <div className="score-factor-grid large-score-grid comfort-score-grid">
        {asArray(fit.factors).map((factor: any) => (
          <div className="score-factor" key={factor.key || factor.label}>
            <div><strong>{toDisplayText(factor.label)}</strong><em>{toDisplayText(factor.score)}</em></div>
            <div className="usage-bar"><i style={{ width: `${Math.max(8, Math.min(100, Number(factor.score || 0)))}%` }} /></div>
            <span>{toDisplayText(factor.evidence)}</span>
          </div>
        ))}
      </div>
      <div className="result-cluster-grid two mt balanced-blocks">
        <FoldSection title="建议配比" defaultOpen className="inner-fold-card">
          <p className="muted">冲刺 {fit.tierAdvice?.reach} / 匹配 {fit.tierAdvice?.match} / 保底 {fit.tierAdvice?.safe}。{toDisplayText(fit.tierAdvice?.strategy)}</p>
        </FoldSection>
        <FoldSection title="风险点" defaultOpen className="inner-fold-card">
          <ListBlock items={risks} />
        </FoldSection>
      </div>
      {!!nextActions.length && <FoldSection title="下一步动作" defaultOpen className="inner-fold-card"><ListBlock items={nextActions} /></FoldSection>}
    </ResultShell>
  );
}

function MaterialPanel({ items }: { items: any[] }) {
  return (
    <div className="material-list single-list compact-material-list">
      {asArray(items).map((item, i) => <div className="material-item" key={i}><strong>{toDisplayText(item)}</strong></div>)}
    </div>
  );
}

export default function Applications() {
  const [hydrated, setHydrated] = useState(false);
  const [name, setName] = useState('Chris');
  const [country, setCountry] = useState('英国');
  const [major, setMajor] = useState('计算机科学');
  const [degree, setDegree] = useState('硕士');
  const [gpa, setGpa] = useState('3.2');
  const [scale, setScale] = useState('4');
  const [languageType, setLanguageType] = useState('IELTS');
  const [languageScore, setLanguageScore] = useState('6.5');
  const [gaokaoTaken, setGaokaoTaken] = useState('否');
  const [gaokaoScore, setGaokaoScore] = useState('');
  const [budget, setBudget] = useState('30万人民币');
  const [experience, setExperience] = useState('马来西亚 APU 计算机本科，有软件项目、AI/数据项目、实习和 GitHub 作品集');
  const [targetSchools, setTargetSchools] = useState('暂未确定');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = readSessionState<any>(STORAGE_KEY, {});
    if (saved.form) {
      setName(saved.form.name ?? 'Chris'); setCountry(saved.form.country ?? '英国'); setMajor(saved.form.major ?? '计算机科学'); setDegree(saved.form.degree ?? '硕士');
      setGpa(saved.form.gpa ?? '3.2'); setScale(saved.form.scale ?? '4'); setLanguageType(saved.form.languageType ?? 'IELTS'); setLanguageScore(saved.form.languageScore ?? '6.5');
      setGaokaoTaken(saved.form.gaokaoTaken ?? '否'); setGaokaoScore(saved.form.gaokaoScore ?? ''); setBudget(saved.form.budget ?? '30万人民币');
      setExperience(saved.form.experience ?? '马来西亚 APU 计算机本科，有软件项目、AI/数据项目、实习和 GitHub 作品集'); setTargetSchools(saved.form.targetSchools ?? '暂未确定');
    }
    if (saved.result) setResult(saved.result);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeSessionState(STORAGE_KEY, { form: { name, country, major, degree, gpa, scale, languageType, languageScore, gaokaoTaken, gaokaoScore, budget, experience, targetSchools }, result });
  }, [hydrated, name, country, major, degree, gpa, scale, languageType, languageScore, gaokaoTaken, gaokaoScore, budget, experience, targetSchools, result]);

  const language = useMemo(() => buildLanguage(languageType, languageScore), [languageType, languageScore]);
  const exportMarkdown = useMemo(() => {
    if (!result) return '';
    if (result.exportMarkdown) return result.exportMarkdown;
    const writing = result.writingBrief || {};
    const drafts = result.drafts || {};
    return `# ${name} 申请案卷\n\n## 适配评分\n${result.fit?.overall || '-'} / 100（${result.fit?.band || '-'}）\n\n## PS 主题\n${toDisplayText(writing.psTheme)}\n\n## PS 大纲\n${asArray(writing.psOutline).map((x) => `- ${toDisplayText(x)}`).join('\n')}\n\n## Personal Statement 初稿\n${toDisplayText(drafts.personalStatement)}\n\n## CV 摘要\n${toDisplayText(drafts.cvSummary)}\n\n## 推荐信素材\n${toDisplayText(drafts.recommendationSeed)}\n\n## 材料清单\n${asArray(result.materialChecklist).map((x) => `- ${toDisplayText(x)}`).join('\n')}\n`;
  }, [result, name]);

  async function logError(err: any, started: number) {
    try {
      await api.post('/tools/client-error-log', {
        toolName: '申请案卷页面', activeTool: 'applications', endpoint: '/tools/application-plan',
        message: err?.response?.data?.message || err?.message || '生成失败', durationMs: Date.now() - started,
      });
    } catch {}
  }

  async function run(e?: FormEvent) {
    e?.preventDefault();
    const started = Date.now();
    setLoading(true);
    setError('');
    try {
      const payload = { name, country, major, degree, gpa, cgpa: gpa, scale, language, languageType, languageScore, gaokaoTaken, gaokaoScore, budget, experience, background: experience, targetSchools };
      const [fitRes, planRes] = await Promise.all([
        api.post('/tools/profile-fit', payload),
        api.post('/tools/application-plan', payload),
      ]);
      const next = { ...(planRes.data || {}), fit: fitRes.data || null };
      setResult(next);
      writeSessionState(STORAGE_KEY, { form: { name, country, major, degree, gpa, scale, languageType, languageScore, gaokaoTaken, gaokaoScore, budget, experience, targetSchools }, result: next });
      window.setTimeout(() => document.querySelector('#app-score')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || '生成失败');
      await logError(err, started);
    } finally {
      setLoading(false);
    }
  }

  const risks = result ? Array.from(new Set([...asArray(result.riskFlags), ...asArray(result.fit?.risks), ...asArray(result.fit?.riskSignals)].map(toDisplayText))).filter(Boolean) : [];
  const actions = result ? Array.from(new Set([...asArray(result.nextBestActions), ...asArray(result.fit?.nextActions)].map(toDisplayText))).filter(Boolean) : [];

  return (
    <section className="page-stack compact-page applications-page-v9">
      <div className="page-title elevated clean-title">
        <div>
          <span className="eyebrow">申请案卷</span>
          <h1>文书与材料流程</h1>
          <p>结果会保存在本机；切换页面后回来不会清空。</p>
        </div>
        <div className="title-actions">
          {result && <button className="ghost-button" onClick={() => downloadText(`application-${name || 'student'}.md`, exportMarkdown)}>导出 Markdown</button>}
          {result && <button className="ghost-button" onClick={() => downloadText(`application-${name || 'student'}.json`, JSON.stringify(result, null, 2), 'application/json;charset=utf-8')}>导出 JSON</button>}
        </div>
      </div>

      {error && <div className="error-card"><strong>操作失败</strong><p>{error}</p></div>}
      {result?.llmFallbackReason && <div className="permission-banner">已使用兜底结果：{toDisplayText(result.llmFallbackReason)}</div>}


      <div className={`two-col application-workbench-v9 application-workbench-v13 application-workbench-v15 ${result ? 'with-result' : ''}`}>
        <section className={`panel compact-form-card ${result ? 'form-panel-inline' : 'sticky-panel'}`}>
          <div className="panel-title compact form-action-title"><div><span className="eyebrow">录入</span><h2>学生档案</h2></div><button className="primary compact-run-button" type="button" disabled={loading} onClick={() => run()}>{loading ? '生成中...' : '生成申请案卷'}</button></div>
          <form className="form-stack" onSubmit={run}>
            <div className="form-grid two">
              <label>学生称呼<input value={name} onChange={(e) => setName(e.target.value)} /></label>
              <label>目标国家<select value={country} onChange={(e) => setCountry(e.target.value)}>{countryOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label>目标专业<select value={major} onChange={(e) => setMajor(e.target.value)}>{majorOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label>申请学位<select value={degree} onChange={(e) => setDegree(e.target.value)}>{degreeOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label>GPA / CGPA<input value={gpa} onChange={(e) => setGpa(e.target.value)} /></label>
              <label>满分制<select value={scale} onChange={(e) => setScale(e.target.value)}><option value="4">4.0</option><option value="5">5.0</option><option value="100">100</option></select></label>
              <label>语言类型<select value={languageType} onChange={(e) => setLanguageType(e.target.value)}>{languageTypeOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label>语言分数<input value={languageScore} onChange={(e) => setLanguageScore(e.target.value)} placeholder="例如 6.5 / 90 / 65" disabled={languageType === '暂无'} /></label>
              {degree === '本科' && <label>是否有高考成绩<select value={gaokaoTaken} onChange={(e) => setGaokaoTaken(e.target.value)}><option value="否">否</option><option value="是">是</option></select></label>}
              {degree === '本科' && gaokaoTaken === '是' && <label>高考分数<input value={gaokaoScore} onChange={(e) => setGaokaoScore(e.target.value)} placeholder="例如 580/750" /></label>}
              <label>预算<select value={budget} onChange={(e) => setBudget(e.target.value)}>{budgetOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            </div>
            <label>项目 / 实习 / 课程经历<textarea value={experience} onChange={(e) => setExperience(e.target.value)} /></label>
            <label>目标院校<input value={targetSchools} onChange={(e) => setTargetSchools(e.target.value)} /></label>
          </form>
        </section>

        <section className="panel generated-result-panel application-result-panel-v9 application-result-panel-v10 application-result-panel-v15 application-result-panel-v13">
          <div className="panel-title compact">
            <div><span className="eyebrow">结果</span><h2>申请案卷</h2></div>
            {result && <span className="pill success">已生成</span>}
          </div>
          {!result ? <div className="empty-advice compact-empty"><div className="empty-icon">CRM</div><h2>先生成申请案卷</h2><p>结果会包含评分、文书、材料和流程。</p></div> : (
            <div className="application-output-stack-v10 application-output-grid-v11 application-output-grid-v13 application-output-grid-v15 application-output-grid-v16">
              <SectionNav items={[
                { id: 'app-score', label: '评分' },
                { id: 'app-brief', label: '方向' },
                { id: 'app-drafts', label: '初稿' },
                { id: 'app-pipeline', label: '流程' },
                { id: 'app-materials', label: '材料' },
              ]} />

              <div className="app-grid-item app-grid-score"><ScorePanel fit={result.fit} /></div>

              <div className="app-grid-item app-grid-brief"><ResultShell id="app-brief" title="文书方向" subtitle="PS、CV、推荐信">
                <div className="app-brief-board-v10 app-brief-board-v16">
                  <TextPanel title="PS 主题" content={result.writingBrief?.psTheme} className="app-brief-main" />
                  <div className="app-brief-side-v10">
                    <FoldSection title="PS 大纲" defaultOpen className="inner-fold-card"><ListBlock items={result.writingBrief?.psOutline} /></FoldSection>
                    <FoldSection title="CV 重点" defaultOpen className="inner-fold-card"><div className="tag-row">{asArray(result.writingBrief?.cvHighlights).map((x, i) => <span key={i}>{toDisplayText(x)}</span>)}</div></FoldSection>
                    <FoldSection title="推荐信角度" defaultOpen className="inner-fold-card"><ListBlock items={result.writingBrief?.recommendationAngles} /></FoldSection>
                  </div>
                </div>
              </ResultShell></div>

              <div className="app-grid-item app-grid-drafts"><ResultShell id="app-drafts" title="可编辑初稿" subtitle="左侧长文，右侧摘要与推荐信">
                <div className="panel-title inner-title"><span className="eyebrow">文书</span><button className="ghost-button" onClick={() => navigator.clipboard?.writeText(exportMarkdown)}>复制全部</button></div>
                <div className="app-draft-grid-v10 app-draft-grid-v16">
                  <TextPanel title="Personal Statement 初稿" content={result.drafts?.personalStatement} className="draft-main-card" />
                  <div className="app-draft-side-v10 app-draft-side-v16">
                    <TextPanel title="CV Summary" content={result.drafts?.cvSummary} />
                    <TextPanel title="推荐信素材" content={result.drafts?.recommendationSeed} />
                  </div>
                </div>
              </ResultShell></div>

              <div id="app-pipeline" className="app-grid-item app-grid-pipeline result-cluster-grid balanced-blocks app-pipeline-grid-v10 app-pipeline-grid-v16">
                <ResultShell title="申请执行" subtitle="按任务节点推进"><div className="pipeline-list compact-pipeline pipeline-board-v16">{(asArray(result.pipeline).length ? asArray(result.pipeline) : defaultStages).map((stage: any, index) => <StageCard key={stage.stage || index} stage={stage} index={index} />)}</div></ResultShell>
                <ResultShell title="风险与下一步" subtitle="人工确认"><div className="nested-card-grid two risk-action-grid-v16"><FoldSection title="风险点" defaultOpen className="inner-fold-card"><ListBlock items={risks} /></FoldSection><FoldSection title="下一步" defaultOpen className="inner-fold-card"><ListBlock items={actions} /></FoldSection></div></ResultShell>
              </div>

              <div className="app-grid-item app-grid-materials"><ResultShell id="app-materials" title="材料清单" subtitle="递交前逐校核对">
                <MaterialPanel items={asArray(result.materialChecklist)} />
              </ResultShell></div>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
