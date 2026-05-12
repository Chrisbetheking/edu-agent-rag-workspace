import { FormEvent, useMemo, useState } from 'react';
import { api } from '../api/client';
import { asArray, downloadText, stringifySafe } from '../utils/export';
import { buildLanguage, budgetOptions, countryOptions, degreeOptions, languageTypeOptions, majorOptions } from '../constants/options';
import { FoldSection, ListBlock, SectionGroup, SectionNav, TextBlock, toDisplayText } from '../components/FoldSection';

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
    <FoldSection title={`${index + 1}. ${item.stage}`} subtitle={item.owner} badge={item.status} defaultOpen className="inner-fold-card">
      <ListBlock items={item.tasks} />
    </FoldSection>
  );
}

function TextPanel({ title, content }: { title: string; content: unknown }) {
  const text = toDisplayText(content);
  return (
    <FoldSection title={title} defaultOpen className="inner-fold-card" badge={<button className="mini-copy" type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigator.clipboard?.writeText(text); }}>复制</button>}>
      <TextBlock value={text || '暂无内容'} />
    </FoldSection>
  );
}

function ScorePanel({ fit }: { fit: any }) {
  if (!fit) return null;
  const risks = [...asArray(fit.risks), ...asArray(fit.riskSignals), ...asArray(fit.riskFlags)];
  const nextActions = [...asArray(fit.nextActions), ...asArray(fit.nextBestActions)];
  return (
    <SectionGroup id="app-score" title={`申请适配度 ${fit.overall}/100`} subtitle="weighted-fit-v2">
      <div className="score-layout app-score-layout">
        <div className="score-circle"><strong>{toDisplayText(fit.band)}</strong><span>{toDisplayText(fit.overall)}</span></div>
        <div className="score-factor-grid">
          {asArray(fit.factors).map((factor: any) => (
            <div className="score-factor" key={factor.key || factor.label}>
              <div><strong>{toDisplayText(factor.label)}</strong><em>{toDisplayText(factor.score)}</em></div>
              <div className="usage-bar"><i style={{ width: `${Math.max(8, Math.min(100, Number(factor.score || 0)))}%` }} /></div>
              <span>{toDisplayText(factor.evidence)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="result-cluster-grid two mt">
        <FoldSection title="建议配比" defaultOpen className="inner-fold-card">
          <p className="muted">冲刺 {fit.tierAdvice?.reach} / 匹配 {fit.tierAdvice?.match} / 保底 {fit.tierAdvice?.safe}。{toDisplayText(fit.tierAdvice?.strategy)}</p>
        </FoldSection>
        <FoldSection title="风险点" defaultOpen className="inner-fold-card">
          <ListBlock items={risks} />
        </FoldSection>
      </div>
      {!!nextActions.length && <FoldSection title="下一步动作" defaultOpen className="inner-fold-card"><ListBlock items={nextActions} /></FoldSection>}
    </SectionGroup>
  );
}

function MaterialPanel({ items }: { items: any[] }) {
  return (
    <div className="material-list single-list">
      {asArray(items).map((item, i) => <div className="material-item" key={i}><strong>{toDisplayText(item)}</strong></div>)}
    </div>
  );
}

export default function Applications() {
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
        toolName: '申请案卷页面',
        activeTool: 'applications',
        endpoint: '/tools/application-plan',
        message: err?.response?.data?.message || err?.message || '生成失败',
        durationMs: Date.now() - started,
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
      setResult({ ...(planRes.data || {}), fit: fitRes.data || null });
      window.setTimeout(() => document.querySelector('#app-score')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || '生成失败');
      await logError(err, started);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page-stack compact-page">
      <div className="page-title elevated clean-title">
        <div>
          <span className="eyebrow">申请案卷</span>
          <h1>文书与材料流程</h1>
          <p>生成后默认展开；需要查看下面内容时，收起上方模块即可。</p>
        </div>
        <div className="title-actions">
          {result && <button className="ghost-button" onClick={() => downloadText(`application-${name || 'student'}.md`, exportMarkdown)}>导出 Markdown</button>}
          {result && <button className="ghost-button" onClick={() => downloadText(`application-${name || 'student'}.json`, JSON.stringify(result, null, 2), 'application/json;charset=utf-8')}>导出 JSON</button>}
        </div>
      </div>

      {error && <div className="error-card"><strong>操作失败</strong><p>{error}</p></div>}
      {result?.llmFallbackReason && <div className="permission-banner">已使用兜底结果：{toDisplayText(result.llmFallbackReason)}</div>}

      {result && <SectionNav items={[
        { id: 'app-score', label: '评分' },
        { id: 'app-brief', label: '方向' },
        { id: 'app-drafts', label: '初稿' },
        { id: 'app-pipeline', label: '流程' },
        { id: 'app-materials', label: '材料' },
      ]} />}

      <div className="two-col wide-left">
        <section className="panel sticky-panel compact-form-card">
          <div className="panel-title compact"><span className="eyebrow">录入</span><h2>学生档案</h2></div>
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
            <button className="primary" disabled={loading}>{loading ? '生成中...' : '生成申请案卷'}</button>
          </form>
        </section>

        <section className="panel generated-result-panel">
          <div className="panel-title compact"><span className="eyebrow">结果</span><h2>文书方向</h2></div>
          {!result ? <div className="empty-advice compact-empty"><div className="empty-icon">CRM</div><h2>先生成申请案卷</h2><p>结果会包含评分、文书、材料和流程。</p></div> : (
            <SectionGroup id="app-brief" title="文书方向" subtitle="PS、CV、推荐信">
              <div className="ops-card-grid nested-card-grid two">
                <TextPanel title="PS 主题" content={result.writingBrief?.psTheme} />
                <FoldSection title="PS 大纲" defaultOpen className="inner-fold-card"><ListBlock items={result.writingBrief?.psOutline} /></FoldSection>
                <FoldSection title="CV 重点" defaultOpen className="inner-fold-card"><div className="tag-row">{asArray(result.writingBrief?.cvHighlights).map((x, i) => <span key={i}>{toDisplayText(x)}</span>)}</div></FoldSection>
                <FoldSection title="推荐信角度" defaultOpen className="inner-fold-card"><ListBlock items={result.writingBrief?.recommendationAngles} /></FoldSection>
              </div>
            </SectionGroup>
          )}
        </section>
      </div>

      {result && <ScorePanel fit={result.fit} />}

      {result && (
        <SectionGroup id="app-drafts" title="可编辑初稿" subtitle="可复制、可收起">
          <div className="panel-title inner-title"><span className="eyebrow">文书</span><button className="ghost-button" onClick={() => navigator.clipboard?.writeText(exportMarkdown)}>复制全部</button></div>
          <div className="draft-grid nested-card-grid three draft-grid-soft">
            <TextPanel title="Personal Statement 初稿" content={result.drafts?.personalStatement} />
            <TextPanel title="CV Summary" content={result.drafts?.cvSummary} />
            <TextPanel title="推荐信素材" content={result.drafts?.recommendationSeed} />
          </div>
        </SectionGroup>
      )}

      {result && (
        <SectionGroup id="app-pipeline" title="申请执行" subtitle="按任务节点推进">
          <div className="pipeline-list compact-pipeline">{(asArray(result.pipeline).length ? asArray(result.pipeline) : defaultStages).map((stage: any, index) => <StageCard key={stage.stage || index} stage={stage} index={index} />)}</div>
        </SectionGroup>
      )}

      {result && (
        <div id="app-materials" className="result-cluster-grid two">
          <SectionGroup title="材料清单"><MaterialPanel items={asArray(result.materialChecklist)} /></SectionGroup>
          <SectionGroup title="风险与下一步"><ul className="check-list">{[...asArray(result.riskFlags), ...asArray(result.nextBestActions)].map((item, i) => <li key={i}>{stringifySafe(item)}</li>)}</ul></SectionGroup>
        </div>
      )}
    </section>
  );
}
