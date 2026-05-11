import { FormEvent, useState } from 'react';
import { api } from '../api/client';

function JsonBlock({ data }: { data: unknown }) {
  return <pre className="json-block compact-json">{JSON.stringify(data, null, 2)}</pre>;
}

function CopyCard({ title, content }: { title: string; content: string | string[] }) {
  const text = Array.isArray(content) ? content.join('\n') : content;
  return (
    <article className="copy-card">
      <div className="row-between top-align">
        <h3>{title}</h3>
        <button className="ghost-button" type="button" onClick={() => navigator.clipboard?.writeText(text)}>复制</button>
      </div>
      {Array.isArray(content) ? <ul>{content.map((item) => <li key={item}>{item}</li>)}</ul> : <p>{content}</p>}
    </article>
  );
}

export default function FrontDesk() {
  const [student, setStudent] = useState('马来西亚 APU 计算机本科，CGPA 3.2，有软件项目和实习经历');
  const [country, setCountry] = useState('英国');
  const [major, setMajor] = useState('计算机科学 / 数据科学');
  const [angle, setAngle] = useState('GPA 不算高，但想用项目经历提高申请竞争力');
  const [platform, setPlatform] = useState('小红书 + 短视频 + 微信私域');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function generate(e?: FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/tools/growth-campaign', { student, country, major, angle, platform });
      setResult(data);
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
          <p>给留学公司前台用：把一个学生背景直接生成小红书笔记、短视频脚本、微信跟进话术和内容日历。</p>
        </div>
        <span className="status-dot">AI content ready</span>
      </div>

      {error && <div className="error-card"><strong>生成失败</strong><p>{error}</p></div>}

      <div className="two-col wide-right">
        <section className="panel form-panel">
          <div className="panel-title compact"><span className="eyebrow">Input</span><h2>获客内容 Brief</h2></div>
          <form className="form-stack" onSubmit={generate}>
            <label>学生背景<textarea value={student} onChange={(e) => setStudent(e.target.value)} /></label>
            <div className="form-grid two">
              <label>目标国家<input value={country} onChange={(e) => setCountry(e.target.value)} /></label>
              <label>目标专业<input value={major} onChange={(e) => setMajor(e.target.value)} /></label>
            </div>
            <label>内容角度<textarea value={angle} onChange={(e) => setAngle(e.target.value)} /></label>
            <label>投放平台<input value={platform} onChange={(e) => setPlatform(e.target.value)} /></label>
            <button className="primary" disabled={loading}>{loading ? '生成中...' : '生成前台获客内容'}</button>
          </form>
          <div className="hint-card">Demo 讲法：这不是单纯聊天，而是把咨询公司前台的获客动作产品化，能直接复制内容去发。</div>
        </section>

        <section className="panel">
          <div className="panel-title compact"><span className="eyebrow">Output</span><h2>可直接使用的内容包</h2></div>
          {!result ? (
            <div className="empty-advice compact-empty"><div className="empty-icon">✍</div><h2>等待生成</h2><p>输入学生画像后，系统会生成多平台内容。</p></div>
          ) : (
            <div className="copy-grid">
              <CopyCard title="小红书标题" content={result.xiaohongshu?.title || ''} />
              <CopyCard title="小红书正文" content={[result.xiaohongshu?.hook, ...(result.xiaohongshu?.body || []), result.xiaohongshu?.cta].filter(Boolean)} />
              <CopyCard title="短视频脚本" content={[result.videoScript?.opening, ...(result.videoScript?.shots || []), result.videoScript?.ending].filter(Boolean)} />
              <CopyCard title="微信私域跟进" content={result.wechatFollowup || []} />
              <CopyCard title="内容日历" content={(result.contentCalendar || []).map((item: any) => `${item.day}｜${item.topic}｜${item.format}`)} />
              <JsonBlock data={result} />
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
