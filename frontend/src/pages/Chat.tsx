import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth';
import { FoldSection, ListBlock, ResultShell, SectionGroup, SectionNav, TextBlock, toDisplayText } from '../components/FoldSection';
import { readSessionState, writeSessionState } from '../utils/sessionState';
import { mergeToolsDraft, runAdvisorInBackground } from '../utils/workspaceBridge';

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
  answerMode?: 'school_plan' | 'grounded_qa' | string;
  structured?: StructuredAdvice | null;
  sources: any[];
  toolCalls: any[];
  conversationId: string;
  quota?: { limit: number | null; used: number | null; remaining: number | null };
  observability?: {
    requestId?: string;
    retrievalLatencyMs?: number;
    llmLatencyMs?: number;
    totalLatencyMs?: number;
    ragHitCount?: number;
    ragScores?: number[];
    cacheHit?: boolean;
    answerMode?: string;
    retrievalModes?: string[];
    fallbackTriggered?: boolean;
    fallbackReason?: string;
  };
}


const CHAT_STORAGE_KEY = 'eduagent.chat.v9';
let pendingChatRequest: Promise<{ data: ChatResult; conversations: any[] }> | null = null;

function persistChatSnapshot(snapshot: Partial<{ question: string; result: ChatResult | null; conversations: any[] }>) {
  const previous = readSessionState<any>(CHAT_STORAGE_KEY, {});
  writeSessionState(CHAT_STORAGE_KEY, { ...previous, ...snapshot });
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

function formatMs(value?: number) {
  const ms = Number(value || 0);
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
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



function parseLooseJson(value: unknown): any {
  if (typeof value !== 'string') return value;
  const text = value.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  if (!text || !/^[\[{]/.test(text)) return value;
  try { return JSON.parse(text); } catch { return value; }
}

function DisplayValue({ value }: { value: unknown }) {
  const parsed = parseLooseJson(value);
  if (Array.isArray(parsed)) {
    return <ul className="clean-list compact-clean-list">{parsed.slice(0, 8).map((item, index) => <li key={index}>{toDisplayText(parseLooseJson(item))}</li>)}</ul>;
  }
  if (parsed && typeof parsed === 'object') {
    return (
      <div className="smart-object-grid">
        {Object.entries(parsed as Record<string, unknown>).slice(0, 12).map(([key, val]) => (
          <div key={key} className="smart-object-cell">
            <span>{key}</span>
            <strong>{toDisplayText(parseLooseJson(val)) || '-'}</strong>
          </div>
        ))}
      </div>
    );
  }
  return <p className="pre-line compact-text-block">{cleanText(parsed) || '暂无内容'}</p>;
}

function SourceCard({ source, index }: { source: any; index: number }) {
  const metaItems = [
    ['rank', source.rank || index + 1],
    ['score', source.score],
    ['mode', source.retrievalMode],
    ['cache', source.cacheHit ? 'hit' : 'miss'],
    ['candidate', source.candidateSource],
    ['vector', source.vectorScore],
    ['keyword', source.keywordScore],
    ['boost', source.hybridBoost],
    ['intentLock', source.intentLockWeight],
  ].filter(([, value]) => value !== undefined && value !== null && value !== '');

  return (
    <FoldSection title={cleanText(source.documentTitle || source.title || `来源 ${index + 1}`)} subtitle={`score ${cleanText(source.score) || '-'} · ${cleanText(source.retrievalMode || 'unknown')}`} defaultOpen={index < 2} className="inner-fold-card source-card-v13">
      <div className="tag-row source-debug-row">
        {metaItems.map(([key, value]) => <span key={String(key)}>{String(key)}: {cleanText(value)}</span>)}
      </div>
      <DisplayValue value={source.content || source.chunk || source.text} />
    </FoldSection>
  );
}

function ObservabilityCard({ result }: { result: ChatResult }) {
  const obs = result.observability;
  if (!obs) return null;

  const modeText = cleanText(obs.answerMode || result.answerMode || '-');
  const retrievalModes = Array.isArray(obs.retrievalModes) && obs.retrievalModes.length ? obs.retrievalModes.join(' / ') : '-';
  const scoreText = Array.isArray(obs.ragScores) && obs.ragScores.length ? obs.ragScores.map((score) => Number(score).toFixed(2)).join(', ') : '-';

  return (
    <SectionGroup title="可观测性" subtitle="latency / cache / mode / fallback" defaultOpen>
      <div className="smart-object-grid observability-grid">
        <div className="smart-object-cell"><span>回答模式</span><strong>{modeText}</strong></div>
        <div className="smart-object-cell"><span>检索模式</span><strong>{retrievalModes}</strong></div>
        <div className="smart-object-cell"><span>检索耗时</span><strong>{formatMs(obs.retrievalLatencyMs)}</strong></div>
        <div className="smart-object-cell"><span>模型耗时</span><strong>{formatMs(obs.llmLatencyMs)}</strong></div>
        <div className="smart-object-cell"><span>总耗时</span><strong>{formatMs(obs.totalLatencyMs)}</strong></div>
        <div className="smart-object-cell"><span>RAG 命中</span><strong>{obs.ragHitCount ?? result.sources?.length ?? 0}</strong></div>
        <div className="smart-object-cell"><span>缓存</span><strong>{obs.cacheHit ? 'Hit' : 'Miss'}</strong></div>
        <div className="smart-object-cell"><span>Fallback</span><strong>{obs.fallbackTriggered ? (obs.fallbackReason || 'triggered') : 'No'}</strong></div>
      </div>
      <div className="tag-row"><span>scores: {scoreText}</span>{obs.requestId && <span>requestId: {obs.requestId}</span>}</div>
    </SectionGroup>
  );
}

function ToolCallCard({ call, index }: { call: any; index: number }) {
  return (
    <FoldSection title={cleanText(call.name || call.toolName || `工具 ${index + 1}`)} subtitle={cleanText(call.status || call.type || 'tool')} defaultOpen={index === 0} className="inner-fold-card tool-call-card-v13">
      <DisplayValue value={call.result || call.output || call} />
    </FoldSection>
  );
}

function profileFromChat(question: string, data: ChatResult) {
  const structured = data.structured || tryParseStructuredAnswer(data.rawAnswer) || tryParseStructuredAnswer(data.answer);
  const profile = structured?.profile;
  const text = `${question}\n${data.answer || ''}`;
  const countryMatch = text.match(/(英国|澳洲|澳大利亚|新加坡|香港|加拿大|美国|新西兰|爱尔兰|荷兰|德国|法国|日本|韩国|马来西亚)/);
  const majorMatch = text.match(/(计算机科学|计算机|数据科学|人工智能|AI|软件工程|网络安全|金融科技|商科|传媒|教育|心理|法律|设计)/i);
  const gpaMatch = text.match(/(?:CGPA|GPA|均分)\s*([0-9]+(?:\.[0-9]+)?)/i);
  const budgetMatch = text.match(/预算\s*([0-9]+\s*万[^，。\s]*)/);
  const languageMatch = text.match(/(IELTS|雅思|TOEFL|托福|PTE|Duolingo)\s*([0-9]+(?:\.[0-9]+)?)/i);
  const languageType = languageMatch?.[1]?.replace('雅思', 'IELTS').replace('托福', 'TOEFL') || 'IELTS';
  return {
    name: 'Chris',
    country: cleanText(profile?.targetCountry) || countryMatch?.[1] || '英国',
    major: cleanText(profile?.targetMajor) || (majorMatch?.[1]?.toUpperCase() === 'AI' ? '人工智能' : majorMatch?.[1]) || '计算机科学',
    degree: text.includes('本科') && !text.includes('硕士') ? '本科' : '硕士',
    cgpa: gpaMatch?.[1] || '3.2',
    scale: text.includes('/5') ? '5' : (text.includes('均分') ? '100' : '4'),
    budget: cleanText(profile?.budget) || budgetMatch?.[1] || '30万人民币',
    languageType,
    languageScore: languageMatch?.[2] || '6.5',
    experience: cleanText(profile?.education) || question,
    concern: cleanText(profile?.competitiveness) || '希望用项目经历提升申请竞争力',
  };
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

      <SectionGroup id="chat-summary" title="总体判断" defaultOpen>
        <div className="summary-card inner-summary">
          <h2>{cleanText(data.summary)}</h2>
        </div>
      </SectionGroup>

      <SectionGroup id="chat-profile" title="背景拆解" subtitle="成绩、国家、专业、预算" defaultOpen>
        <div className="profile-grid">
          <DetailItem label="学生背景" value={data.profile?.education} />
          <DetailItem label="成绩判断" value={data.profile?.gpa} />
          <DetailItem label="目标国家" value={data.profile?.targetCountry} />
          <DetailItem label="专业方向" value={data.profile?.targetMajor} />
          <DetailItem label="预算判断" value={data.profile?.budget} />
          <DetailItem label="竞争力" value={data.profile?.competitiveness} />
        </div>
      </SectionGroup>

      <SectionGroup id="chat-schools" title="三档选校方案" subtitle="冲刺 / 匹配 / 保底" defaultOpen>
        <div className="tier-grid">
          {(data.schoolTiers || []).map((tier) => (
            <FoldSection title={cleanText(tier.tier)} subtitle={cleanText(tier.level)} key={tier.tier} defaultOpen>
              <p className="tier-strategy">{cleanText(tier.strategy)}</p>
              <div className="school-list">
                {(tier.schools || []).map((school, index) => (
                  <FoldSection title={cleanText(school.name)} subtitle={cleanText(tier.tier)} key={`${tier.tier}-${school.name}-${index}`} defaultOpen className="inner-fold-card">
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
      </SectionGroup>

      <div className="advice-two-col">
        <SectionGroup id="chat-timeline" title="申请时间规划" defaultOpen>
          <div className="timeline-cards">
            {(data.timeline || []).length ? (data.timeline || []).map((item, index) => (
              <FoldSection title={`${index + 1}. ${cleanText(item.phase)}`} subtitle={cleanTime(item.time)} key={`${item.phase}-${index}`} defaultOpen className="inner-fold-card">
                <ListBlock items={item.tasks} />
              </FoldSection>
            )) : <div className="empty-mini">暂无时间线；可根据学校开放时间补充。</div>}
          </div>
        </SectionGroup>

        <SectionGroup id="chat-risk" title="风险和下一步" defaultOpen>
          <h3>风险提醒</h3>
          <div className="tag-list danger">{(data.risks || []).map((risk, index) => <span key={index}>{cleanText(risk)}</span>)}</div>
          <h3>下一步动作</h3>
          <div className="action-list">{(data.nextActions || []).map((action, index) => <div key={index}>{cleanText(action)}</div>)}</div>
        </SectionGroup>
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
    let alive = true;
    const cached = readSessionState<any>(CHAT_STORAGE_KEY, {});
    if (cached.question) setQuestion(cached.question);
    if (cached.result) setResult(cached.result);
    if (Array.isArray(cached.conversations)) setConversations(cached.conversations);

    if (pendingChatRequest) {
      setLoading(true);
      pendingChatRequest
        .then(({ data, conversations }) => {
          persistChatSnapshot({ result: data, conversations });
          if (!alive) return;
          setResult(data);
          setConversations(conversations);
          setError('');
        })
        .catch((err) => {
          if (!alive) return;
          const message = err?.response?.data?.message || err?.response?.data?.error || err?.message || '请求失败，请稍后重试。';
          setError(`AI 对话请求失败：${message}`);
        })
        .finally(() => { if (alive) setLoading(false); });
    } else {
      api
        .get('/chat/conversations')
        .then((res) => {
          persistChatSnapshot({ conversations: res.data });
          if (alive) setConversations(res.data);
        })
        .catch((err) => console.error('加载历史会话失败：', err));
    }
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    persistChatSnapshot({ question, result, conversations });
  }, [question, result, conversations]);

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
    const currentQuestion = question;
    persistChatSnapshot({ question: currentQuestion });
    pendingChatRequest = api
      .post('/chat', { question: currentQuestion, topK: 3 })
      .then(async ({ data }) => {
        const conv = await api.get('/chat/conversations').catch(() => ({ data: conversations }));
        persistChatSnapshot({ question: currentQuestion, result: data, conversations: conv.data });
        return { data, conversations: conv.data };
      })
      .finally(() => { pendingChatRequest = null; });

    try {
      const { data, conversations: convData } = await pendingChatRequest;
      setResult(data);
      const bridgedProfile = profileFromChat(currentQuestion, data);
      mergeToolsDraft(bridgedProfile, { active: 'advisor' });
      if (!isGuest) {
        runAdvisorInBackground(api, bridgedProfile);
      }
      if (data.quota && isGuest && user) {
        setUser({ ...user, quotaLimit: data.quota.limit, quotaRemaining: data.quota.remaining });
      }
      setConversations(convData);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.response?.data?.error || err?.message || '请求失败，请稍后重试。';
      setError(`AI 对话请求失败：${message}`);
      try {
        await api.post('/tools/client-error-log', { toolName: 'AI 咨询页面', activeTool: 'chat', endpoint: '/chat', message });
      } catch {}
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
          <p>输入学生背景后生成结构化选校方案；请求在后台继续执行，切换页面后回来结果不会丢。</p>
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
        <div className="meta-grid meta-grid-v13">
          <ObservabilityCard result={result} />

          <SectionGroup title="来源引用" subtitle="RAG 命中文档" defaultOpen>
            <div className="meta-card-grid-v13">
              {result.sources?.length ? result.sources.map((s, i) => <SourceCard source={s} index={i} key={s.id || i} />) : <p className="muted-text">暂无来源引用。</p>}
            </div>
          </SectionGroup>

          <SectionGroup title="工具调用" subtitle="结构化输出" defaultOpen>
            <div className="meta-card-grid-v13">
              {result.toolCalls?.length ? result.toolCalls.map((t, i) => <ToolCallCard call={t} index={i} key={i} />) : <p className="muted-text">本次未触发工具。</p>}
            </div>
          </SectionGroup>

          <SectionGroup title="历史会话" defaultOpen>
            {conversations.length ? conversations.slice(0, 6).map((c) => (
              <div className="history-row" key={c.id}>
                <strong>{cleanText(c.title)}</strong>
                <span>{new Date(c.updatedAt).toLocaleString()}</span>
              </div>
            )) : <p className="muted-text">暂无历史会话。</p>}
          </SectionGroup>
        </div>
      )}
    </section>
  );
}
