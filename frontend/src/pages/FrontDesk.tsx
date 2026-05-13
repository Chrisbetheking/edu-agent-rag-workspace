import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { asArray, downloadText, stringifySafe } from '../utils/export';
import { angleOptions, countryOptions, degreeOptions, majorOptions, platformOptions } from '../constants/options';
import { readSessionState, writeSessionState } from '../utils/sessionState';

const STORAGE_KEY = 'eduagent.frontdesk.v10';


const frontDeskPresets = [
  {
    label: 'Chris｜APU 计算机', name: 'Chris', degree: '硕士', country: '英国', major: '计算机科学',
    student: '马来西亚 APU 计算机本科，CGPA 3.2，有软件项目、AI/数据项目和实习经历。',
    angle: 'GPA 不算高，但项目经历可以补强', platform: '小红书 + 微信私域',
  },
  {
    label: '双非｜AI硕士', name: '学生A', degree: '硕士', country: '英国', major: '人工智能',
    student: '双非一本计算机相关专业，均分85，有机器学习课程项目、Web 全栈项目和一段实习。',
    angle: '想冲更好学校，需要明确选校梯度', platform: '小红书 + 微信私域',
  },
  {
    label: '澳洲｜数据科学', name: '学生B', degree: '硕士', country: '澳洲', major: '数据科学',
    student: '软件工程本科，GPA 3.5/4.0，有 Python 数据分析、数据库和实习经历，想转数据科学。',
    angle: '转专业担心课程匹配度和预算', platform: '朋友圈 + 私信',
  },
];

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


function parseCalendarItem(item: any) {
  if (typeof item === 'string') {
    try { return JSON.parse(item); } catch { return { content: item }; }
  }
  return item && typeof item === 'object' ? item : { content: stringifySafe(item) };
}

function CalendarCard({ items }: { items: any[] }) {
  const parsed = items.map(parseCalendarItem);
  const copyText = parsed.map((x, i) => `${x.day || `第 ${i + 1} 天`}｜${x.date || ''}｜${x.platform || ''}｜${x.type || x.format || ''}｜${x.topic || x.title || x.content || ''}`).join('\n');
  return (
    <article className="copy-card enhanced-card full-span-card publish-plan-card-v18">
      <div className="row-between top-align">
        <h3>发布计划</h3>
        <button className="ghost-button" type="button" onClick={() => navigator.clipboard?.writeText(copyText)}>复制</button>
      </div>
      <div className="publish-plan-grid-v18">
        {parsed.map((item, index) => (
          <div className="publish-plan-item-v18" key={index}>
            <div className="row-between top-align"><strong>{item.day || `第 ${index + 1} 天`}</strong><span>{item.date || item.time || ''}</span></div>
            <div className="tag-row compact-tags"><span>{item.platform || '渠道'}</span><span>{item.type || item.format || '内容'}</span></div>
            <h4>{item.topic || item.title || '跟进内容'}</h4>
            <p>{item.content || item.copy || item.text || stringifySafe(item)}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

export default function FrontDesk() {
  const [hydrated, setHydrated] = useState(false);
  const [name, setName] = useState('');
  const [student, setStudent] = useState('');
  const [country, setCountry] = useState('');
  const [major, setMajor] = useState('');
  const [degree, setDegree] = useState('');
  const [angle, setAngle] = useState('');
  const [platform, setPlatform] = useState('');
  const [gaokaoTaken, setGaokaoTaken] = useState('否');
  const [gaokaoScore, setGaokaoScore] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');


  useEffect(() => {
    const saved = readSessionState<any>(STORAGE_KEY, {});
    if (saved.form) {
      setName(saved.form.name ?? '');
      setStudent(saved.form.student ?? '');
      setCountry(saved.form.country ?? '');
      setMajor(saved.form.major ?? '');
      setDegree(saved.form.degree ?? '');
      setAngle(saved.form.angle ?? '');
      setPlatform(saved.form.platform ?? '');
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


  function applyPreset(preset: any) {
    setName(preset.name || ''); setStudent(preset.student || ''); setCountry(preset.country || ''); setMajor(preset.major || '');
    setDegree(preset.degree || ''); setAngle(preset.angle || angleOptions[0]); setPlatform(preset.platform || platformOptions[0]);
  }

  function clearForm() {
    setName(''); setStudent(''); setCountry(''); setMajor(''); setDegree(''); setAngle(''); setPlatform('');
    setGaokaoTaken('否'); setGaokaoScore(''); setResult(null); writeSessionState(STORAGE_KEY, { form: {}, result: null });
  }

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
    <section className="page-stack compact-page frontdesk-page-v18">
      <div className="page-title elevated clean-title">
        <div>
          <span className="eyebrow">客户线索</span>
          <h1>获客内容与跟进话术</h1>
          <p>默认空表单，可一键填入线索画像，生成可复制的笔记、短视频脚本和私域跟进内容。</p>
        </div>
        <div className="title-actions">
          {result && <button className="ghost-button" onClick={() => downloadText(`lead-${name || 'student'}.md`, exportContent)}>导出 Markdown</button>}
          {result && <button className="ghost-button" onClick={() => downloadText(`lead-${name || 'student'}.json`, JSON.stringify(result, null, 2), 'application/json;charset=utf-8')}>导出 JSON</button>}
        </div>
      </div>

      {error && <div className="error-card"><strong>生成失败</strong><p>{error}</p></div>}
      {result?.llmFallbackReason && <div className="permission-banner">已使用兜底结果：{result.llmFallbackReason}</div>}

      <div className="frontdesk-workbench-v18">
        <section className="panel form-panel sticky-panel">
          <div className="panel-title compact form-action-title"><div><span className="eyebrow">录入</span><h2>学生信息</h2></div><button className="ghost-button" type="button" onClick={clearForm}>清空</button></div>
          <form className="form-stack" onSubmit={generate}>
            <div className="form-grid two">
              <label>学生称呼<input value={name} onChange={(e) => setName(e.target.value)} /></label>
              <label>申请学位<select value={degree} onChange={(e) => setDegree(e.target.value)}><option value="">请选择</option>{degreeOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              {degree === '本科' && <label>是否有高考成绩<select value={gaokaoTaken} onChange={(e) => setGaokaoTaken(e.target.value)}><option value="否">否</option><option value="是">是</option></select></label>}
              {degree === '本科' && gaokaoTaken === '是' && <label>高考分数<input value={gaokaoScore} onChange={(e) => setGaokaoScore(e.target.value)} placeholder="例如 580/750" /></label>}
            </div>
            <label>学生背景<textarea value={student} onChange={(e) => setStudent(e.target.value)} /></label>
            <div className="form-grid two">
              <label>目标国家<select value={country} onChange={(e) => setCountry(e.target.value)}><option value="">请选择</option>{countryOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label>目标专业<select value={major} onChange={(e) => setMajor(e.target.value)}><option value="">请选择</option>{majorOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            </div>
            <label>沟通切入点<select value={angle} onChange={(e) => setAngle(e.target.value)}><option value="">请选择</option>{angleOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label>投放渠道<select value={platform} onChange={(e) => setPlatform(e.target.value)}><option value="">请选择</option>{platformOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <div className="quick-fill-panel"><strong>快速填写</strong><div className="example-row">{frontDeskPresets.map((preset) => <button type="button" key={preset.label} onClick={() => applyPreset(preset)}>{preset.label}</button>)}</div></div>
            <button className="primary" disabled={loading}>{loading ? '生成中...' : '生成内容'}</button>
          </form>
        </section>

        <section className="panel result-panel">
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
