import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth';
import { FoldSection, ListBlock, SectionNav, TextBlock, toDisplayText } from '../components/FoldSection';

interface SchoolAdvice {
  name: string;
  reason: string;
  fit: string;
  risk: string;
  action: string;
}

interface SchoolTier {
  tier: string;
  level: string;
  strategy: string;
  schools: SchoolAdvice[];
}

interface 时间线Item {
  phase: string;
  time: string;
  tasks: string[];
}

interface StructuredAdvice {
  summary: string;
  profile: {
    education: string;
    gpa: string;
    targetCountry: string;
    targetMajor: string;
    budget: string;
    competitiveness: string;
  };
  schoolTiers: SchoolTier[];
  timeline: 时间线Item[];
  risks: string[];
  nextActions: string[];
  disclaimer: string;
}

interface ChatResult {
  answer: string;
  rawAnswer?: string;
  structured?: StructuredAdvice | null;
  sources: any[];
  toolCalls: any[];
  conversationId: string;
  quota?: { limit: number | null; used: number | null; remaining: number | null };
}

const examples = [
  'APU 计算机本科 CGPA 3.2，想申请英国硕士，预算30万，请给我冲刺、匹配、保底三档选校。',
  '马来西亚本科软件工程，GPA 3.5，想申请澳洲数据科学硕士，怎么规划？',
  '双非本科均分82，想申请英国人工智能硕士，预算35万，有哪些学校适合？',
];

function cleanText(text?: unknown) {
  return toDisplayText(text)
    .replace(/\*\*/g, '')
    .replace(/###/g, '')
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();
}

function cleanTime(text?: unknown) {
  const value = cleanText(text).replace(/20\d{2}年/g, '').replace(/^[-—\s]+/, '').trim();
  return value || '按申请开放时间调整';
}

function stripCodeFence(text: string) {
  return String(text || '')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
}

function tryParseStructuredAnswer(text?: string): StructuredAdvice | null {
  if (!text) return null;
  const cleaned = stripCodeFence(text);
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function DetailItem({ label, value }: { label: string; value?: unknown }) {
  return (
    <div className="profile-item">
      <span>{label}</span>
      <strong>{cleanText(value) || '待补充'}</strong>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="empty-advice">
      <div className="empty-icon">AI</div>
      <h2>输入学生背景，生成结构化选校方案</h2>
      <p>系统会拆成背景判断、三档院校、风险提醒和下一步动作。</p>
    </div>
  );
}

function StructuredResult({ data }: { data: StructuredAdvice }) {
  return (
    <div className="advice-result">
      <SectionNav items={[
        { id: 'chat-summary', label: '判断' },
        { id: 'chat-profile', label: '背景' },
        { id: 'chat-schools', label: '学校' },
        { id: 'chat-timeline', label: '时间线' },
        { id: 'chat-risk', label: '风险' },
      ]} />

      <FoldSection id="chat-summary" title="总体判断" defaultOpen>
        <div className="summary-card inner-summary">
          <h2>{cleanText(data.summary)}</h2>
        </div>
      </FoldSection>

      <FoldSection id="chat-profile" title="背景拆解" subtitle="成绩、国家、专业、预算" defaultOpen>
        <div className="profile-grid">
          <DetailItem label="学生背景" value={data.profile?.education} />
          <DetailItem label="成绩判断" value={data.profile?.gpa} />
          <DetailItem label="目标国家" value={data.profile?.targetCountry} />
          <DetailItem label="专业方向" value={data.profile?.targetMajor} />
          <DetailItem label="预算判断" value={data.profile?.budget} />
          <DetailItem label="竞争力" value={data.profile?.competitiveness} />
        </div>
      </FoldSection>

      <FoldSection id="chat-schools" title="三档选校方案" subtitle="冲刺 / 匹配 / 保底" defaultOpen>
        <div className="tier-grid">
          {(data.schoolTiers || []).map((tier) => (
            <FoldSection title={cleanText(tier.tier)} subtitle={cleanText(tier.level)} key={tier.tier} defaultOpen={tier.tier !== '冲刺'}>
              <p className="tier-strategy">{cleanText(tier.strategy)}</p>
              <div className="school-list">
                {(tier.schools || []).map((school, index) => (
                  <FoldSection title={cleanText(school.name)} subtitle={cleanText(tier.tier)} key={`${tier.tier}-${school.name}-${index}`}>
                    <div className="school-detail"><span>推荐原因</span><p>{cleanText(school.reason)}</p></div>
                    <div className="school-detail"><span>适配点</span><p>{cleanText(school.fit)}</p></div>
                    <div className="school-detail warn"><span>风险点</span><p>{cleanText(school.risk)}</p></div>
                    <div className="school-action">下一步：{cleanText(school.action)}</div>
                  </FoldSection>
                ))}
              </div>
            </FoldSection>
          ))}
        </div>
      </FoldSection>

      <div className="advice-two-col">
        <FoldSection id="chat-timeline" title="申请时间规划" defaultOpen>
          <div className="timeline-cards">
            {(data.timeline || []).map((item, index) => (
              <FoldSection title={`${index + 1}. ${cleanText(item.phase)}`} subtitle={cleanTime(item.time)} key={`${item.phase}-${index}`} defaultOpen={index === 0}>
                <ListBlock items={item.tasks} />
              </FoldSection>
            ))}
          </div>
        </FoldSection>

        <FoldSection id="chat-risk" title="风险和下一步" defaultOpen>
          <h3>风险提醒</h3>
          <div className="tag-list danger">{(data.risks || []).map((risk, index) => <span key={index}>{cleanText(risk)}</span>)}</div>
          <h3>下一步动作</h3>
          <div className="action-list">{(data.nextActions || []).map((action, index) => <div key={index}>{cleanText(action)}</div>)}</div>
        </FoldSection>
      </div>

      <div className="disclaimer-card">{cleanText(data.disclaimer) || '最终要求以学校官网和当年招生要求为准。'}</div>
    </div>
  );
}

export default function Chat() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const isGuest = user?.role === 'guest';
  const [question, setQuestion] = useState(examples[0]);
  const [result, setResult] = useState<ChatResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/chat/conversations')
      .then((res) => setConversations(res.data))
      .catch((err) => console.error('加载历史会话失败：', err));
  }, []);

  const structured = useMemo(() => {
    if (!result) return null;
    if (result.structured) return result.structured;
    return tryParseStructuredAnswer(result.rawAnswer) || tryParseStructuredAnswer(result.answer) || null;
  }, [result]);

  async function ask(e: FormEvent) {
    e.preventDefault();
    if (!question.trim()) {
      setError('请输入问题。');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const { data } = await api.post('/chat', { question, topK: 3 });
      setResult(data);
      if (data.quota && isGuest && user) {
        setUser({ ...user, quotaLimit: data.quota.limit, quotaRemaining: data.quota.remaining });
      }
      const conv = await api.get('/chat/conversations');
      setConversations(conv.data);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.response?.data?.error || err?.message || '请求失败，请稍后重试。';
      setError(`AI 对话请求失败：${message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="chat-page-v2">
      <div className="hero-panel">
        <div>
          <span className="section-kicker">AI 咨询</span>
          <h1>AI 咨询与选校</h1>
          <p>输入学生背景后，系统会结合知识库和工具判断，生成结构化选校方案。</p>
        </div>
        <div className="model-badge">{isGuest ? `访客额度 ${user?.quotaRemaining ?? '-'} / ${user?.quotaLimit ?? '-'}` : '后端已连接'}</div>
      </div>

      <div className="prompt-panel">
        <form onSubmit={ask} className="prompt-box">
          <label>学生背景 / 咨询问题</label>
          <textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="请输入学生背景、目标国家、专业方向、预算等信息..." />
          <div className="example-row">{examples.map((item) => <button type="button" key={item} onClick={() => setQuestion(item)}>{item.slice(0, 18)}...</button>)}</div>
          <button className="primary ask-button" disabled={loading}>{loading ? '正在生成结构化方案...' : '生成选校方案'}</button>
        </form>
      </div>

      {error && <div className="error-card"><strong>请求失败</strong><p>{error}</p></div>}
      {!result && !loading && !error && <EmptyState />}
      {loading && <div className="loading-card"><div className="loader-dot" /><div><strong>正在分析学生背景和院校档次</strong><p>系统会把回答拆成卡片，并附上来源引用和工具调用记录。</p></div></div>}

      {structured && <StructuredResult data={structured} />}

      {result && !structured && (
        <FoldSection title="AI 回答" defaultOpen>
          <TextBlock value={result.answer} />
          <div className="error-card" style={{ marginTop: 16 }}><strong>提示</strong><p>当前回答没有解析成卡片，可能是模型返回被截断。可以稍后重试，或调高后端输出上限。</p></div>
        </FoldSection>
      )}

      {result && (
        <div className="meta-grid">
          <FoldSection title="来源引用" defaultOpen>
            {result.sources?.length ? result.sources.map((s, i) => (
              <div className="source-card" key={s.id || i}>
                <strong>{cleanText(s.documentTitle || '未命名资料')}</strong>
                <span>相似度：{cleanText(s.score)}</span>
                <p>{cleanText(s.content)}</p>
              </div>
            )) : <p className="muted-text">暂无来源引用。</p>}
          </FoldSection>

          <FoldSection title="工具调用">
            {result.toolCalls?.length ? result.toolCalls.map((t, i) => (
              <div className="tool-card" key={i}>
                <strong>{cleanText(t.name)}</strong>
                <pre>{JSON.stringify(t.result, null, 2)}</pre>
              </div>
            )) : <p className="muted-text">本次未触发工具。</p>}
          </FoldSection>

          <FoldSection title="历史会话">
            {conversations.length ? conversations.slice(0, 6).map((c) => (
              <div className="history-row" key={c.id}>
                <strong>{cleanText(c.title)}</strong>
                <span>{new Date(c.updatedAt).toLocaleString()}</span>
              </div>
            )) : <p className="muted-text">暂无历史会话。</p>}
          </FoldSection>
        </div>
      )}
    </section>
  );
}
