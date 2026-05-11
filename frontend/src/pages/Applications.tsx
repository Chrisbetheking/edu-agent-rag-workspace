import { FormEvent, useState } from 'react';
import { api } from '../api/client';

function StageCard({ stage }: { stage: any }) {
  return (
    <article className="pipeline-stage">
      <div>
        <span className="pill success">{stage.status}</span>
        <h3>{stage.stage}</h3>
        <p>负责人：{stage.owner}</p>
      </div>
      <ul>{(stage.tasks || []).map((task: string) => <li key={task}>{task}</li>)}</ul>
    </article>
  );
}

export default function Applications() {
  const [name, setName] = useState('Chris');
  const [country, setCountry] = useState('英国');
  const [major, setMajor] = useState('计算机科学');
  const [degree, setDegree] = useState('硕士');
  const [gpa, setGpa] = useState('3.2/4.0');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function run(e?: FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/tools/application-plan', { name, country, major, degree, gpa });
      setResult(data);
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
          <p>把留学公司后端流程做成可执行工作台：线索评估、选校定位、文书制作、递交追踪、材料 checklist。</p>
        </div>
        <span className="status-dot">CRM workflow</span>
      </div>

      {error && <div className="error-card"><strong>操作失败</strong><p>{error}</p></div>}

      <div className="two-col wide-left">
        <section className="panel">
          <div className="panel-title compact"><span className="eyebrow">Case Intake</span><h2>学生档案</h2></div>
          <form className="form-stack" onSubmit={run}>
            <div className="form-grid two">
              <label>学生称呼<input value={name} onChange={(e) => setName(e.target.value)} /></label>
              <label>目标国家<input value={country} onChange={(e) => setCountry(e.target.value)} /></label>
              <label>目标专业<input value={major} onChange={(e) => setMajor(e.target.value)} /></label>
              <label>申请学位<input value={degree} onChange={(e) => setDegree(e.target.value)} /></label>
              <label>GPA / CGPA<input value={gpa} onChange={(e) => setGpa(e.target.value)} /></label>
            </div>
            <button className="primary" disabled={loading}>{loading ? '编排中...' : '生成申请执行方案'}</button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-title compact"><span className="eyebrow">Material Center</span><h2>材料与文书重点</h2></div>
          {!result ? <div className="empty-mini">先生成一个学生申请方案。</div> : (
            <div className="ops-card-grid">
              <div className="ops-card"><h3>PS 主题</h3><p>{result.writingBrief?.psTheme}</p></div>
              <div className="ops-card"><h3>CV 亮点</h3><div className="tag-row">{(result.writingBrief?.cvHighlights || []).map((x: string) => <span key={x}>{x}</span>)}</div></div>
              <div className="ops-card"><h3>推荐信角度</h3><ul>{(result.writingBrief?.recommendationAngles || []).map((x: string) => <li key={x}>{x}</li>)}</ul></div>
            </div>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="panel-title compact"><span className="eyebrow">Pipeline</span><h2>申请执行流</h2></div>
        {!result ? (
          <div className="empty-mini">生成后会出现完整后端流程。</div>
        ) : (
          <div className="pipeline-grid">{(result.pipeline || []).map((stage: any) => <StageCard key={stage.stage} stage={stage} />)}</div>
        )}
      </section>

      {result && (
        <div className="two-col">
          <section className="panel">
            <div className="panel-title compact"><span className="eyebrow">Checklist</span><h2>材料清单</h2></div>
            <div className="tag-row large-tags">{(result.materialChecklist || []).map((item: string) => <span key={item}>{item}</span>)}</div>
          </section>
          <section className="panel">
            <div className="panel-title compact"><span className="eyebrow">Risks & Next Actions</span><h2>风险与下一步</h2></div>
            <ul className="check-list">{[...(result.riskFlags || []), ...(result.nextBestActions || [])].map((item: string) => <li key={item}>{item}</li>)}</ul>
          </section>
        </div>
      )}
    </section>
  );
}
