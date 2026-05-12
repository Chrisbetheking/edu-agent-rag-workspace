import { FormEvent, useMemo, useState } from 'react';
import { api } from '../api/client';
import { asArray, downloadText, stringifySafe } from '../utils/export';

function StageCard({ stage, index }: { stage: any; index: number }) {
  return (
    <article className="pipeline-stage enhanced-card">
      <div className="stage-number">{index + 1}</div>
      <div>
        <span className="pill success">{stage.status || '待开始'}</span>
        <h3>{stage.stage || '申请阶段'}</h3>
        <p>负责人：{stage.owner || '申请顾问'}</p>
      </div>
      <ul>{asArray(stage.tasks).map((task, i) => <li key={i}>{stringifySafe(task)}</li>)}</ul>
    </article>
  );
}

function TextPanel({ title, content }: { title: string; content: unknown }) {
  const text = stringifySafe(content);
  return (
    <article className="ops-card enhanced-card">
      <div className="row-between top-align">
        <h3>{title}</h3>
        <button className="ghost-button" type="button" onClick={() => navigator.clipboard?.writeText(text)}>复制</button>
      </div>
      <p>{text || '暂无内容'}</p>
    </article>
  );
}

export default function Applications() {
  const [name, setName] = useState('Chris');
  const [country, setCountry] = useState('英国');
  const [major, setMajor] = useState('计算机科学');
  const [degree, setDegree] = useState('硕士');
  const [gpa, setGpa] = useState('3.2/4.0');
  const [language, setLanguage] = useState('IELTS 6.5');
  const [budget, setBudget] = useState('30万人民币');
  const [experience, setExperience] = useState('马来西亚 APU 计算机本科，有软件项目、AI/数据项目、实习和 GitHub 作品集');
  const [targetSchools, setTargetSchools] = useState('暂未确定，希望系统给出冲刺/匹配/保底建议');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const exportMarkdown = useMemo(() => {
    if (!result) return '';
    if (result.exportMarkdown) return result.exportMarkdown;
    const writing = result.writingBrief || {};
    const drafts = result.drafts || {};
    return `# ${name} 申请执行方案\n\n## PS 主题\n${writing.psTheme || ''}\n\n## PS 大纲\n${asArray(writing.psOutline).map((x) => `- ${stringifySafe(x)}`).join('\n')}\n\n## Personal Statement 初稿\n${drafts.personalStatement || ''}\n\n## CV 摘要\n${drafts.cvSummary || ''}\n\n## 推荐信素材\n${drafts.recommendationSeed || ''}\n\n## 材料清单\n${asArray(result.materialChecklist).map((x) => `- ${stringifySafe(x)}`).join('\n')}\n`;
  }, [result, name]);

  async function run(e?: FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/tools/application-plan', { name, country, major, degree, gpa, cgpa: gpa, language, budget, experience, background: experience, targetSchools });
      setResult(data || {});
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || '生成申请后台失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page-stack">
      <div className="page-title elevated">
        <div>
          <span className="eyebrow">Application Operations CRM</span>
          <h1>申请后台</h1>
          <p>把留学公司后端流程做成可执行工作台：学生建档、文书初稿、CV 亮点、推荐信素材、材料 checklist 和递交流程都由后端 AI 生成。</p>
        </div>
        <div className="title-actions">
          <span className="status-dot">AI document workflow</span>
          {result && <button className="ghost-button" onClick={() => downloadText(`application-${name || 'student'}.md`, exportMarkdown)}>导出文书方案</button>}
          {result && <button className="ghost-button" onClick={() => downloadText(`application-${name || 'student'}.json`, JSON.stringify(result, null, 2), 'application/json;charset=utf-8')}>导出 JSON</button>}
        </div>
      </div>

      {error && <div className="error-card"><strong>操作失败</strong><p>{error}</p></div>}
      {result?.llmFallbackReason && <div className="permission-banner">AI 调用已自动降级：{result.llmFallbackReason}</div>}

      <div className="two-col wide-left">
        <section className="panel sticky-panel">
          <div className="panel-title compact"><span className="eyebrow">Case Intake</span><h2>学生档案</h2></div>
          <form className="form-stack" onSubmit={run}>
            <div className="form-grid two">
              <label>学生称呼<input value={name} onChange={(e) => setName(e.target.value)} /></label>
              <label>目标国家<input value={country} onChange={(e) => setCountry(e.target.value)} /></label>
              <label>目标专业<input value={major} onChange={(e) => setMajor(e.target.value)} /></label>
              <label>申请学位<input value={degree} onChange={(e) => setDegree(e.target.value)} /></label>
              <label>GPA / CGPA<input value={gpa} onChange={(e) => setGpa(e.target.value)} /></label>
              <label>语言成绩<input value={language} onChange={(e) => setLanguage(e.target.value)} /></label>
              <label>预算<input value={budget} onChange={(e) => setBudget(e.target.value)} /></label>
              <label>目标院校<input value={targetSchools} onChange={(e) => setTargetSchools(e.target.value)} /></label>
            </div>
            <label>项目 / 实习 / 课程经历<textarea value={experience} onChange={(e) => setExperience(e.target.value)} /></label>
            <button className="primary" disabled={loading}>{loading ? 'AI 编排中...' : '生成申请文书与执行方案'}</button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-title compact"><span className="eyebrow">Writing Center</span><h2>文书与材料重点</h2></div>
          {!result ? <div className="empty-advice compact-empty"><div className="empty-icon">CRM</div><h2>先生成一个学生申请方案</h2><p>生成后会出现 PS 初稿、CV 摘要、推荐信素材和材料 checklist。</p></div> : (
            <div className="ops-card-grid">
              <TextPanel title="PS 主题" content={result.writingBrief?.psTheme} />
              <div className="ops-card enhanced-card"><h3>PS 大纲</h3><ul>{asArray(result.writingBrief?.psOutline).map((x, i) => <li key={i}>{stringifySafe(x)}</li>)}</ul></div>
              <div className="ops-card enhanced-card"><h3>CV 亮点</h3><div className="tag-row">{asArray(result.writingBrief?.cvHighlights).map((x, i) => <span key={i}>{stringifySafe(x)}</span>)}</div></div>
              <div className="ops-card enhanced-card"><h3>推荐信角度</h3><ul>{asArray(result.writingBrief?.recommendationAngles).map((x, i) => <li key={i}>{stringifySafe(x)}</li>)}</ul></div>
            </div>
          )}
        </section>
      </div>

      {result && (
        <section className="panel document-draft-panel">
          <div className="panel-title">
            <div><span className="eyebrow">AI Drafts</span><h2>可导出的文书初稿</h2></div>
            <button className="ghost-button" onClick={() => navigator.clipboard?.writeText(exportMarkdown)}>复制全部</button>
          </div>
          <div className="draft-grid">
            <TextPanel title="Personal Statement 初稿" content={result.drafts?.personalStatement} />
            <TextPanel title="CV Profile Summary" content={result.drafts?.cvSummary} />
            <TextPanel title="推荐信素材 Seed" content={result.drafts?.recommendationSeed} />
          </div>
        </section>
      )}

      <section className="panel">
        <div className="panel-title compact"><span className="eyebrow">Pipeline</span><h2>申请执行流</h2></div>
        {!result ? (
          <div className="empty-mini">生成后会出现完整后端流程。</div>
        ) : (
          <div className="pipeline-grid">{asArray(result.pipeline).map((stage: any, index) => <StageCard key={stage.stage || index} stage={stage} index={index} />)}</div>
        )}
      </section>

      {result && (
        <div className="two-col">
          <section className="panel">
            <div className="panel-title compact"><span className="eyebrow">Checklist</span><h2>材料清单</h2></div>
            <div className="tag-row large-tags">{asArray(result.materialChecklist).map((item, i) => <span key={i}>{stringifySafe(item)}</span>)}</div>
          </section>
          <section className="panel">
            <div className="panel-title compact"><span className="eyebrow">Risks & Next Actions</span><h2>风险与下一步</h2></div>
            <ul className="check-list">{[...asArray(result.riskFlags), ...asArray(result.nextBestActions)].map((item, i) => <li key={i}>{stringifySafe(item)}</li>)}</ul>
          </section>
        </div>
      )}
    </section>
  );
}
