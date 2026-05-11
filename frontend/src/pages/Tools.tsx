import { FormEvent, useMemo, useState } from 'react';
import { api } from '../api/client';

type ToolKey = 'cgpa' | 'school' | 'copywriting' | 'material';

const toolTabs: Array<{ key: ToolKey; name: string; desc: string; tag: string }> = [
  { key: 'cgpa', name: 'CGPA 换算', desc: '把 4.0 / 5.0 / 百分制换成申请判断。', tag: 'Academic' },
  { key: 'school', name: '院校推荐', desc: '输出冲刺、匹配、保底三档院校。', tag: 'Planning' },
  { key: 'copywriting', name: '销售话术', desc: '生成微信沟通、电话提纲和短视频脚本。', tag: 'Growth' },
  { key: 'material', name: '材料清单', desc: '按国家和学位整理申请材料 checklist。', tag: 'Ops' },
];

function JsonBlock({ data }: { data: unknown }) {
  return <pre className="json-block">{JSON.stringify(data, null, 2)}</pre>;
}

export default function Tools() {
  const [active, setActive] = useState<ToolKey>('school');
  const [cgpa, setCgpa] = useState('3.2');
  const [scale, setScale] = useState('4');
  const [country, setCountry] = useState('英国');
  const [major, setMajor] = useState('计算机科学');
  const [budget, setBudget] = useState('30万人民币');
  const [language, setLanguage] = useState('IELTS 6.5');
  const [name, setName] = useState('Chris');
  const [concern, setConcern] = useState('担心 CGPA 不够和预算超支');
  const [degree, setDegree] = useState('硕士');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const activeMeta = useMemo(() => toolTabs.find((item) => item.key === active) || toolTabs[0], [active]);

  async function callTool(type: ToolKey, e?: FormEvent) {
    e?.preventDefault();
    setActive(type);
    setLoading(true);
    setError('');

    const payload = {
      cgpa: Number(cgpa),
      gpa: Number(cgpa),
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
      degree,
      background: `${country}${major}${degree}申请，GPA ${cgpa}，预算 ${budget}，语言 ${language}`,
    };

    const endpoint = type === 'cgpa'
      ? '/tools/cgpa-convert'
      : type === 'school'
        ? '/tools/school-recommend'
        : type === 'copywriting'
          ? '/tools/copywriting'
          : '/tools/material-list';

    try {
      const { data } = await api.post(endpoint, payload);
      setResult(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || '工具调用失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page-stack">
      <div className="page-title elevated">
        <div>
          <span className="eyebrow">Agent Toolchain</span>
          <h1>Agent 工具中心</h1>
          <p>把留学咨询中的重复判断封装成可调用工具，并把输入、输出和耗时写入日志。</p>
        </div>
        <span className="status-dot">4 tools online</span>
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

      <div className="two-col wide-right">
        <section className="panel form-panel">
          <div className="panel-title compact"><span className="eyebrow">Input</span><h2>{activeMeta.name}</h2></div>
          <form className="form-stack" onSubmit={(e) => callTool(active, e)}>
            <div className="form-grid two">
              <label>CGPA / GPA<input value={cgpa} onChange={(e) => setCgpa(e.target.value)} /></label>
              <label>满分制<select value={scale} onChange={(e) => setScale(e.target.value)}><option value="4">4.0</option><option value="5">5.0</option><option value="100">100</option></select></label>
              <label>目标国家<input value={country} onChange={(e) => setCountry(e.target.value)} /></label>
              <label>目标专业<input value={major} onChange={(e) => setMajor(e.target.value)} /></label>
              <label>预算<input value={budget} onChange={(e) => setBudget(e.target.value)} /></label>
              <label>语言成绩<input value={language} onChange={(e) => setLanguage(e.target.value)} /></label>
              <label>学生称呼<input value={name} onChange={(e) => setName(e.target.value)} /></label>
              <label>申请学位<input value={degree} onChange={(e) => setDegree(e.target.value)} /></label>
            </div>
            <label>核心顾虑<textarea value={concern} onChange={(e) => setConcern(e.target.value)} /></label>
            <button className="primary" disabled={loading}>{loading ? '运行中...' : `运行：${activeMeta.name}`}</button>
          </form>
        </section>

        <section className="panel result-panel">
          <div className="panel-title compact"><span className="eyebrow">Output</span><h2>结构化结果</h2></div>
          {result ? (
            <>
              <div className="result-summary-grid">
                {Object.keys(result).slice(0, 4).map((key) => (
                  <div className="profile-item clean" key={key}>
                    <span>{key}</span>
                    <strong>{Array.isArray(result[key]) ? `${result[key].length} items` : typeof result[key] === 'object' ? 'object' : String(result[key]).slice(0, 36)}</strong>
                  </div>
                ))}
              </div>
              <JsonBlock data={result} />
            </>
          ) : (
            <div className="empty-advice compact-empty">
              <div className="empty-icon">⌘</div>
              <h2>选择工具并运行</h2>
              <p>工具结果会以 JSON 呈现，方便解释 Agent 如何调用业务能力。</p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
