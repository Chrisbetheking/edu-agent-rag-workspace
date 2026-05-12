import { FormEvent, useMemo, useState } from 'react';
import { api } from '../api/client';
import { asArray, downloadText, stringifySafe } from '../utils/export';

function CopyCard({ title, content }: { title: string; content: unknown }) {
  const items = asArray(content).filter(Boolean);
  const text = items.length > 1 ? items.map(stringifySafe).join('\n') : stringifySafe(content);
  return (
    <article className="copy-card enhanced-card">
      <div className="row-between top-align">
        <h3>{title}</h3>
        <button className="ghost-button" type="button" onClick={() => navigator.clipboard?.writeText(text)}>复制</button>
      </div>
      {items.length > 1 ? <ul>{items.map((item, index) => <li key={`${title}-${index}`}>{stringifySafe(item)}</li>)}</ul> : <p>{text || '暂无内容'}</p>}
    </article>
  );
}

function CalendarCard({ items }: { items: any[] }) {
  return (
    <article className="copy-card enhanced-card full-span-card">
      <div className="row-between top-align">
        <h3>内容日历</h3>
        <button className="ghost-button" type="button" onClick={() => navigator.clipboard?.writeText(items.map((x) => `${x.day || ''}｜${x.topic || ''}｜${x.format || ''}`).join('\n'))}>复制</button>
      </div>
      <div className="mini-table">
        {items.map((item, index) => (
          <div key={index}><strong>{item.day || `Day ${index + 1}`}</strong><span>{item.topic || stringifySafe(item)}</span><em>{item.format || '内容'}</em></div>
        ))}
      </div>
    </article>
  );
}

export default function FrontDesk() {
  const [name, setName] = useState('Chris');
  const [student, setStudent] = useState('马来西亚 APU 计算机本科，CGPA 3.2，有软件项目、AI/数据项目和实习经历');
  const [country, setCountry] = useState('英国');
  const [major, setMajor] = useState('计算机科学 / 数据科学');
  const [degree, setDegree] = useState('硕士');
  const [angle, setAngle] = useState('GPA 不算高，但想用项目经历提高申请竞争力');
  const [platform, setPlatform] = useState('小红书 + 短视频 + 微信私域');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const exportContent = useMemo(() => {
    if (!result) return '';
    const xhs = result.xiaohongshu || {};
    const video = result.videoScript || {};
    return `# 前台增长内容包\n\n## Brief\n${result.brief || ''}\n\n## 小红书标题\n${xhs.title || ''}\n\n## 小红书正文\n${[xhs.hook, ...asArray(xhs.body), xhs.cta].filter(Boolean).join('\n\n')}\n\n## Hashtags\n${asArray(xhs.hashtags).join(' ')}\n\n## 短视频脚本\n${[video.opening, ...asArray(video.shots), video.ending].filter(Boolean).join('\n')}\n\n## 微信私域跟进\n${asArray(result.wechatFollowup).map((x) => `- ${stringifySafe(x)}`).join('\n')}\n\n## 内容日历\n${asArray<any>(result.contentCalendar).map((x) => `- ${x.day || ''}｜${x.topic || ''}｜${x.format || ''}`).join('\n')}\n`;
  }, [result]);

  async function generate(e?: FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/tools/growth-campaign', { name, student, background: student, country, major, degree, angle, concern: angle, platform });
      setResult(data || {});
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || '生成失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page-stack">
      <div className="page-title elevated">
        <div>
          <span className="eyebrow">Front Desk Growth Copilot</span>
          <h1>前台增长工作台</h1>
          <p>销售/前台填写学生信息后，后端直接调用 AI 生成小红书笔记、短视频脚本、微信跟进话术和内容日历，并可一键导出。</p>
        </div>
        <div className="title-actions">
          <span className="status-dot">AI content ready</span>
          {result && <button className="ghost-button" onClick={() => downloadText(`frontdesk-${name || 'student'}.md`, exportContent)}>导出 Markdown</button>}
          {result && <button className="ghost-button" onClick={() => downloadText(`frontdesk-${name || 'student'}.json`, JSON.stringify(result, null, 2), 'application/json;charset=utf-8')}>导出 JSON</button>}
        </div>
      </div>

      {error && <div className="error-card"><strong>生成失败</strong><p>{error}</p></div>}
      {result?.llmFallbackReason && <div className="permission-banner">AI 调用已自动降级：{result.llmFallbackReason}</div>}

      <div className="two-col wide-right">
        <section className="panel form-panel sticky-panel">
          <div className="panel-title compact"><span className="eyebrow">Input</span><h2>销售获客 Brief</h2></div>
          <form className="form-stack" onSubmit={generate}>
            <div className="form-grid two">
              <label>学生称呼<input value={name} onChange={(e) => setName(e.target.value)} /></label>
              <label>申请学位<input value={degree} onChange={(e) => setDegree(e.target.value)} /></label>
            </div>
            <label>学生背景<textarea value={student} onChange={(e) => setStudent(e.target.value)} /></label>
            <div className="form-grid two">
              <label>目标国家<input value={country} onChange={(e) => setCountry(e.target.value)} /></label>
              <label>目标专业<input value={major} onChange={(e) => setMajor(e.target.value)} /></label>
            </div>
            <label>内容角度 / 销售切入点<textarea value={angle} onChange={(e) => setAngle(e.target.value)} /></label>
            <label>投放平台<input value={platform} onChange={(e) => setPlatform(e.target.value)} /></label>
            <button className="primary" disabled={loading}>{loading ? 'AI 生成中...' : '生成前台获客内容'}</button>
          </form>
          <div className="hint-card">展示亮点：这是业务工具，不是普通聊天；输入一次学生画像，直接产出可复制、可导出的营销内容包。</div>
        </section>

        <section className="panel result-panel">
          <div className="panel-title compact"><span className="eyebrow">Output</span><h2>可直接使用的内容包</h2></div>
          {!result ? (
            <div className="empty-advice compact-empty"><div className="empty-icon">✍</div><h2>等待生成</h2><p>输入学生画像后，系统会调用后端 AI 生成多平台内容。</p></div>
          ) : (
            <div className="copy-grid two-output-grid">
              <CopyCard title="Brief" content={result.brief} />
              <CopyCard title="小红书标题" content={result.xiaohongshu?.title} />
              <CopyCard title="小红书正文" content={[result.xiaohongshu?.hook, ...asArray(result.xiaohongshu?.body), result.xiaohongshu?.cta].filter(Boolean)} />
              <CopyCard title="Hashtags" content={asArray(result.xiaohongshu?.hashtags).join(' ')} />
              <CopyCard title="短视频脚本" content={[result.videoScript?.opening, ...asArray(result.videoScript?.shots), result.videoScript?.ending].filter(Boolean)} />
              <CopyCard title="微信私域跟进" content={result.wechatFollowup} />
              <CalendarCard items={asArray(result.contentCalendar)} />
              <article className="copy-card enhanced-card full-span-card"><h3>原始结构化 JSON</h3><pre className="json-block compact-json">{JSON.stringify(result, null, 2)}</pre></article>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
