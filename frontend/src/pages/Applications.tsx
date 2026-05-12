import { FormEvent, useMemo, useState } from 'react';
import { api } from '../api/client';
import { asArray, downloadText, stringifySafe } from '../utils/export';

const countryOptions = ['英国', '澳洲', '新加坡', '香港', '加拿大'];
const majorOptions = ['计算机科学', '数据科学', '人工智能', '软件工程', '商业分析', '信息系统'];
const degreeOptions = ['硕士', '本科', '博士'];
const languageOptions = ['IELTS 6.5', 'IELTS 7.0', 'TOEFL 90', 'PTE 65', '暂未考试'];
const budgetOptions = ['20万人民币', '25万人民币', '30万人民币', '35万人民币', '40万人民币以上'];

function StageCard({ stage, index }: { stage: any; index: number }) {
  return (
    <article className="pipeline-stage enhanced-card">
      <div className="stage-number">{index + 1}</div>
      <div><span className="pill success">{stage.status || '待开始'}</span><h3>{stage.stage || '申请阶段'}</h3><p>负责人：{stage.owner || '申请顾问'}</p></div>
      <ul>{asArray(stage.tasks).map((task, i) => <li key={i}>{stringifySafe(task)}</li>)}</ul>
    </article>
  );
}

function TextPanel({ title, content }: { title: string; content: unknown }) {
  const text = stringifySafe(content);
  return (
    <article className="ops-card enhanced-card">
      <div className="row-between top-align"><h3>{title}</h3><button className="ghost-button" type="button" onClick={() => navigator.clipboard?.writeText(text)}>复制</button></div>
      <p>{text || '暂无内容'}</p>
    </article>
  );
}

function ScorePanel({ fit }: { fit: any }) {
  if (!fit) return null;
  return (
    <section className="panel score-panel">
      <div className="panel-title compact"><span className="eyebrow">评分</span><h2>申请适配度 {fit.overall}/100</h2></div>
      <div className="score-layout">
        <div className="score-circle"><strong>{fit.band}</strong><span>{fit.overall}</span></div>
        <div className="score-factor-grid">
          {asArray(fit.factors).map((factor: any) => (
            <div className="score-factor" key={factor.key || factor.label}>
              <div><strong>{factor.label}</strong><em>{factor.score}</em></div>
              <div className="usage-bar"><i style={{ width: `${Math.max(8, Math.min(100, Number(factor.score || 0)))}%` }} /></div>
              <span>{factor.evidence}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="muted">建议配比：冲刺 {fit.tierAdvice?.reach} / 匹配 {fit.tierAdvice?.match} / 保底 {fit.tierAdvice?.safe}。{fit.tierAdvice?.strategy}</p>
    </section>
  );
}

export default function Applications() {
  const [name, setName] = useState('Chris');
  const [country, setCountry] = useState('英国');
  const [major, setMajor] = useState('计算机科学');
  const [degree, setDegree] = useState('硕士');
  const [gpa, setGpa] = useState('3.2');
  const [scale, setScale] = useState('4');
  const [language, setLanguage] = useState('IELTS 6.5');
  const [budget, setBudget] = useState('30万人民币');
  const [experience, setExperience] = useState('马来西亚 APU 计算机本科，有软件项目、AI/数据项目、实习和 GitHub 作品集');
  const [targetSchools, setTargetSchools] = useState('暂未确定');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const exportMarkdown = useMemo(() => {
    if (!result) return '';
    if (result.exportMarkdown) return result.exportMarkdown;
    const writing = result.writingBrief || {};
    const drafts = result.drafts || {};
    return `# ${name} 申请案卷\n\n## 适配评分\n${result.fit?.overall || '-'} / 100（${result.fit?.band || '-'}）\n\n## PS 主题\n${writing.psTheme || ''}\n\n## PS 大纲\n${asArray(writing.psOutline).map((x) => `- ${stringifySafe(x)}`).join('\n')}\n\n## Personal Statement 初稿\n${drafts.personalStatement || ''}\n\n## CV 摘要\n${drafts.cvSummary || ''}\n\n## 推荐信素材\n${drafts.recommendationSeed || ''}\n\n## 材料清单\n${asArray(result.materialChecklist).map((x) => `- ${stringifySafe(x)}`).join('\n')}\n`;
  }, [result, name]);

  async function run(e?: FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = { name, country, major, degree, gpa, cgpa: gpa, scale, language, budget, experience, background: experience, targetSchools };
      const [fitRes, planRes] = await Promise.all([
        api.post('/tools/profile-fit', payload),
        api.post('/tools/application-plan', payload),
      ]);
      setResult({ ...(planRes.data || {}), fit: fitRes.data || null });
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || '生成失败');
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
          <p>录入学生信息后，生成适配评分、文书方向、材料清单和递交流程。</p>
        </div>
        <div className="title-actions">
          {result && <button className="ghost-button" onClick={() => downloadText(`application-${name || 'student'}.md`, exportMarkdown)}>导出 Markdown</button>}
          {result && <button className="ghost-button" onClick={() => downloadText(`application-${name || 'student'}.json`, JSON.stringify(result, null, 2), 'application/json;charset=utf-8')}>导出 JSON</button>}
        </div>
      </div>

      {error && <div className="error-card"><strong>操作失败</strong><p>{error}</p></div>}
      {result?.llmFallbackReason && <div className="permission-banner">已使用兜底结果：{result.llmFallbackReason}</div>}

      <div className="two-col wide-left">
        <section className="panel sticky-panel">
          <div className="panel-title compact"><span className="eyebrow">录入</span><h2>学生档案</h2></div>
          <form className="form-stack" onSubmit={run}>
            <div className="form-grid two">
              <label>学生称呼<input value={name} onChange={(e) => setName(e.target.value)} /></label>
              <label>目标国家<select value={country} onChange={(e) => setCountry(e.target.value)}>{countryOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label>目标专业<select value={major} onChange={(e) => setMajor(e.target.value)}>{majorOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label>申请学位<select value={degree} onChange={(e) => setDegree(e.target.value)}>{degreeOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label>GPA / CGPA<input value={gpa} onChange={(e) => setGpa(e.target.value)} /></label>
              <label>满分制<select value={scale} onChange={(e) => setScale(e.target.value)}><option value="4">4.0</option><option value="5">5.0</option><option value="100">100</option></select></label>
              <label>语言成绩<select value={language} onChange={(e) => setLanguage(e.target.value)}>{languageOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label>预算<select value={budget} onChange={(e) => setBudget(e.target.value)}>{budgetOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            </div>
            <label>项目 / 实习 / 课程经历<textarea value={experience} onChange={(e) => setExperience(e.target.value)} /></label>
            <label>目标院校<input value={targetSchools} onChange={(e) => setTargetSchools(e.target.value)} /></label>
            <button className="primary" disabled={loading}>{loading ? '生成中...' : '生成申请案卷'}</button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-title compact"><span className="eyebrow">结果</span><h2>文书方向</h2></div>
          {!result ? <div className="empty-advice compact-empty"><div className="empty-icon">CRM</div><h2>先生成一个申请案卷</h2><p>结果会包含评分、文书、材料和流程。</p></div> : (
            <div className="ops-card-grid">
              <TextPanel title="PS 主题" content={result.writingBrief?.psTheme} />
              <div className="ops-card enhanced-card"><h3>PS 大纲</h3><ul>{asArray(result.writingBrief?.psOutline).map((x, i) => <li key={i}>{stringifySafe(x)}</li>)}</ul></div>
              <div className="ops-card enhanced-card"><h3>CV 重点</h3><div className="tag-row">{asArray(result.writingBrief?.cvHighlights).map((x, i) => <span key={i}>{stringifySafe(x)}</span>)}</div></div>
              <div className="ops-card enhanced-card"><h3>推荐信角度</h3><ul>{asArray(result.writingBrief?.recommendationAngles).map((x, i) => <li key={i}>{stringifySafe(x)}</li>)}</ul></div>
            </div>
          )}
        </section>
      </div>

      {result && <ScorePanel fit={result.fit} />}

      {result && (
        <section className="panel document-draft-panel">
          <div className="panel-title"><div><span className="eyebrow">文书</span><h2>可编辑初稿</h2></div><button className="ghost-button" onClick={() => navigator.clipboard?.writeText(exportMarkdown)}>复制全部</button></div>
          <div className="draft-grid">
            <TextPanel title="Personal Statement 初稿" content={result.drafts?.personalStatement} />
            <TextPanel title="CV Summary" content={result.drafts?.cvSummary} />
            <TextPanel title="推荐信素材" content={result.drafts?.recommendationSeed} />
          </div>
        </section>
      )}

      <section className="panel">
        <div className="panel-title compact"><span className="eyebrow">流程</span><h2>申请执行</h2></div>
        {!result ? <div className="empty-mini">生成后会出现后续流程。</div> : <div className="pipeline-grid">{asArray(result.pipeline).map((stage: any, index) => <StageCard key={stage.stage || index} stage={stage} index={index} />)}</div>}
      </section>

      {result && (
        <div className="two-col">
          <section className="panel"><div className="panel-title compact"><span className="eyebrow">材料</span><h2>清单</h2></div><div className="tag-row large-tags">{asArray(result.materialChecklist).map((item, i) => <span key={i}>{stringifySafe(item)}</span>)}</div></section>
          <section className="panel"><div className="panel-title compact"><span className="eyebrow">风险</span><h2>下一步</h2></div><ul className="check-list">{[...asArray(result.riskFlags), ...asArray(result.nextBestActions)].map((item, i) => <li key={i}>{stringifySafe(item)}</li>)}</ul></section>
        </div>
      )}
    </section>
  );
}
