import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { asArray, downloadText, stringifySafe } from '../utils/export';
import { angleOptions, countryOptions, degreeOptions, majorOptions, platformOptions } from '../constants/options';
import { readSessionState, writeSessionState } from '../utils/sessionState';

const STORAGE_KEY = 'eduagent.frontdesk.v9';

function parseLooseJson(value: unknown): any {
  if (typeof value !== 'string') return value;
  let text = value.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  if (!text) return value;
  try { return JSON.parse(text); } catch {}
  const objectMatch = text.match(/\{[\s\S]*\}/);
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  const candidate = arrayMatch?.[0] || objectMatch?.[0];
  if (candidate) {
    try { return JSON.parse(candidate); } catch {}
  }
  return value;
}

function compactText(value: unknown): string {
  const parsed = parseLooseJson(value);
  if (Array.isArray(parsed)) return parsed.map(compactText).filter(Boolean).join('；');
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    const prioritized = obj.content || obj.copy || obj.text || obj.script || obj.topic || obj.title || obj.theme;
    if (prioritized) return String(prioritized);
    return Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]): string => `${k}: ${compactText(v)}`).join('；');
  }
  return stringifySafe(parsed).replace(/[{}\[\]"]+/g, '').replace(/\s+/g, ' ').trim();
}

function normalizeCalendarItem(item: any, index: number) {
  const parsed = parseLooseJson(item);
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return {
      day: parsed.day || parsed.date || `第 ${index + 1} 天`,
      platform: parsed.platform || parsed.channel || parsed.place || '内容渠道',
      type: parsed.type || parsed.format || parsed.scene || '内容',
      topic: parsed.topic || parsed.title || parsed.theme || parsed.headline || `第 ${index + 1} 天内容`,
      content: compactText(parsed.content || parsed.copy || parsed.text || parsed.script || parsed.body || parsed),
    };
  }
  return { day: `第 ${index + 1} 天`, platform: '内容渠道', type: '内容', topic: `第 ${index + 1} 天内容`, content: compactText(parsed) };
}


function CopyCard({ title, content }: { title: string; content: unknown }) {
  const parsed = parseLooseJson(content);
  const items = asArray(parsed).filter(Boolean);
  const text = items.length > 1 ? items.map(compactText).join('\n') : compactText(parsed);
  return (
    <article className="copy-card enhanced-card">
      <div className="row-between top-align">
        <h3>{title}</h3>
        <button className="ghost-button" type="button" onClick={() => navigator.clipboard?.writeText(text)}>复制</button>
      </div>
      {items.length > 1 ? <ul>{items.map((item, index) => <li key={`${title}-${index}`}>{compactText(item)}</li>)}</ul> : <p>{text || '暂无内容'}</p>}
    </article>
  );
}

function CalendarCard({ items }: { items: any[] }) {
  const normalized = items.map(normalizeCalendarItem);
  const copyText = normalized.map((x) => `${x.day}｜${x.platform}｜${x.type}｜${x.topic}\n${x.content}`).join('\n\n');
  return (
    <article className="copy-card enhanced-card full-span-card calendar-panel-v13">
      <div className="row-between top-align">
        <div>
          <h3>发布计划</h3>
          <p className="muted compact-note">按时间、渠道和内容类型拆分，避免展示原始 JSON。</p>
        </div>
        <button className="ghost-button" type="button" onClick={() => navigator.clipboard?.writeText(copyText)}>复制</button>
      </div>
      <div className="calendar-board-v14">
        {normalized.map((item, index) => (
          <div className="calendar-row-v14" key={index}>
            <div className="calendar-row-index">
              <strong>{index + 1}</strong>
              <span>{item.day}</span>
            </div>
            <div className="calendar-row-main">
              <div className="calendar-card-head">
                <h4>{item.topic}</h4>
                <div className="tag-row compact-tags"><span>{item.platform}</span><span>{item.type}</span></div>
              </div>
              <p>{item.content || '待补充内容'}</p>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

export default function FrontDesk() {
  const [hydrated, setHydrated] = useState(false);
  const [name, setName] = useState('Chris');
  const [student, setStudent] = useState('马来西亚 APU 计算机本科，CGPA 3.2，有软件项目、AI/数据项目和实习经历');
  const [country, setCountry] = useState('英国');
  const [major, setMajor] = useState('计算机科学');
  const [degree, setDegree] = useState('硕士');
  const [angle, setAngle] = useState(angleOptions[0]);
  const [platform, setPlatform] = useState(platformOptions[0]);
  const [gaokaoTaken, setGaokaoTaken] = useState('否');
  const [gaokaoScore, setGaokaoScore] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');


  useEffect(() => {
    const saved = readSessionState<any>(STORAGE_KEY, {});
    if (saved.form) {
      setName(saved.form.name ?? 'Chris');
      setStudent(saved.form.student ?? '马来西亚 APU 计算机本科，CGPA 3.2，有软件项目、AI/数据项目和实习经历');
      setCountry(saved.form.country ?? '英国');
      setMajor(saved.form.major ?? '计算机科学');
      setDegree(saved.form.degree ?? '硕士');
      setAngle(saved.form.angle ?? angleOptions[0]);
      setPlatform(saved.form.platform ?? platformOptions[0]);
      setGaokaoTaken(saved.form.gaokaoTaken ?? '否');
      setGaokaoScore(saved.form.gaokaoScore ?? '');
    }
    if (saved.result) setResult(saved.result);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeSessionState(STORAGE_KEY, { form: { name, student, country, major, degree, angle, platform, gaokaoTaken, gaokaoScore }, result });
  }, [hydrated, name, student, country, major, degree, angle, platform, gaokaoTaken, gaokaoScore, result]);

  const exportContent = useMemo(() => {
    if (!result) return '';
    const xhs = result.xiaohongshu || {};
    const video = result.videoScript || {};
    return `# 客户线索内容包\n\n## 线索摘要\n${result.brief || ''}\n\n## 标题\n${xhs.title || ''}\n\n## 正文\n${[xhs.hook, ...asArray(xhs.body), xhs.cta].filter(Boolean).join('\n\n')}\n\n## 话题\n${asArray(xhs.hashtags).join(' ')}\n\n## 短视频脚本\n${[video.opening, ...asArray(video.shots), video.ending].filter(Boolean).join('\n')}\n\n## 微信跟进\n${asArray(result.wechatFollowup).map((x) => `- ${stringifySafe(x)}`).join('\n')}\n\n## 发布计划\n${asArray<any>(result.contentCalendar).map((x) => `- ${x.day || ''}｜${x.topic || ''}｜${x.format || ''}`).join('\n')}\n`;
  }, [result]);

  async function generate(e?: FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/tools/growth-campaign', { name, student, background: student, country, major, degree, angle, concern: angle, platform, gaokaoTaken, gaokaoScore });
      setResult(data || {});
      writeSessionState(STORAGE_KEY, { form: { name, student, country, major, degree, angle, platform, gaokaoTaken, gaokaoScore }, result: data || {} });
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
          <span className="eyebrow">客户线索</span>
          <h1>获客内容与跟进话术</h1>
          <p>录入学生画像后，生成可复制的笔记、短视频脚本和私域跟进内容。</p>
        </div>
        <div className="title-actions">
          {result && <button className="ghost-button" onClick={() => downloadText(`lead-${name || 'student'}.md`, exportContent)}>导出 Markdown</button>}
          {result && <button className="ghost-button" onClick={() => downloadText(`lead-${name || 'student'}.json`, JSON.stringify(result, null, 2), 'application/json;charset=utf-8')}>导出 JSON</button>}
        </div>
      </div>

      {error && <div className="error-card"><strong>生成失败</strong><p>{error}</p></div>}
      {result?.llmFallbackReason && <div className="permission-banner">已使用兜底结果：{result.llmFallbackReason}</div>}

      <div className={`two-col wide-right frontdesk-workbench-v13 frontdesk-workbench-v15 ${result ? 'with-result' : ''}`}>
        <section className="panel form-panel sticky-panel">
          <div className="panel-title compact form-action-title"><div><span className="eyebrow">录入</span><h2>学生信息</h2></div><button className="primary compact-run-button" type="button" disabled={loading} onClick={() => generate()}>{loading ? '生成中...' : '生成内容'}</button></div>
          <form className="form-stack" onSubmit={generate}>
            <div className="form-grid two">
              <label>学生称呼<input value={name} onChange={(e) => setName(e.target.value)} /></label>
              <label>申请学位<select value={degree} onChange={(e) => setDegree(e.target.value)}>{degreeOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              {degree === '本科' && <label>是否有高考成绩<select value={gaokaoTaken} onChange={(e) => setGaokaoTaken(e.target.value)}><option value="否">否</option><option value="是">是</option></select></label>}
              {degree === '本科' && gaokaoTaken === '是' && <label>高考分数<input value={gaokaoScore} onChange={(e) => setGaokaoScore(e.target.value)} placeholder="例如 580/750" /></label>}
            </div>
            <label>学生背景<textarea value={student} onChange={(e) => setStudent(e.target.value)} /></label>
            <div className="form-grid two">
              <label>目标国家<select value={country} onChange={(e) => setCountry(e.target.value)}>{countryOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label>目标专业<select value={major} onChange={(e) => setMajor(e.target.value)}>{majorOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            </div>
            <label>沟通切入点<select value={angle} onChange={(e) => setAngle(e.target.value)}>{angleOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label>投放渠道<select value={platform} onChange={(e) => setPlatform(e.target.value)}>{platformOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          </form>
        </section>

        <section className="panel result-panel frontdesk-result-panel-v13 frontdesk-result-panel-v15">
          <div className="panel-title compact"><span className="eyebrow">结果</span><h2>内容包</h2></div>
          {!result ? (
            <div className="empty-advice compact-empty"><div className="empty-icon">✍</div><h2>等待生成</h2><p>填写左侧信息后生成内容。</p></div>
          ) : (
            <div className="copy-grid two-output-grid">
              <CopyCard title="线索摘要" content={result.brief} />
              <CopyCard title="标题" content={result.xiaohongshu?.title} />
              <CopyCard title="正文" content={[result.xiaohongshu?.hook, ...asArray(result.xiaohongshu?.body), result.xiaohongshu?.cta].filter(Boolean)} />
              <CopyCard title="话题" content={asArray(result.xiaohongshu?.hashtags).join(' ')} />
              <CopyCard title="短视频脚本" content={[result.videoScript?.opening, ...asArray(result.videoScript?.shots), result.videoScript?.ending].filter(Boolean)} />
              <CopyCard title="微信跟进" content={result.wechatFollowup} />
              <CalendarCard items={asArray(result.contentCalendar)} />
              <details className="raw-json-details full-span-card"><summary>查看结构化数据</summary><pre className="json-block compact-json">{JSON.stringify(result, null, 2)}</pre></details>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
