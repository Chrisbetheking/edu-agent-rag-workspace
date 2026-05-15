import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, AI_LOADING_HINT, describeDeployment, explainApiFailure, type DeploymentInfo } from '../api/client';
import { buildLanguage, budgetOptions, countryOptions, degreeOptions, languageTypeOptions, majorOptions } from '../constants/options';
import { useAuthStore } from '../store/auth';
import { FoldSection, ListBlock, ResultShell, SectionGroup, SectionNav, TextBlock, toDisplayText } from '../components/FoldSection';
import { readSessionState, writeSessionState } from '../utils/sessionState';
import { mergeToolsDraft, runAdvisorInBackground } from '../utils/workspaceBridge';

interface SchoolAdvice {
  rank?: number;
  name: string;
  nameZh?: string;
  nameEn?: string;
  major?: string;
  majorZh?: string;
  majorEn?: string;
  successRate?: string;
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
  deployment?: DeploymentInfo;
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


const CHAT_STORAGE_KEY = 'eduagent.chat.v12';
let pendingChatRequest: Promise<{ data: ChatResult; conversations: any[] }> | null = null;

function persistChatSnapshot(snapshot: Partial<{ question: string; result: ChatResult | null; conversations: any[]; form: ChatFormState; manualQuestion: boolean }>) {
  const previous = readSessionState<any>(CHAT_STORAGE_KEY, {});
  writeSessionState(CHAT_STORAGE_KEY, { ...previous, ...snapshot });
}

const examples = [
  '英国计算机硕士申请一般需要提交哪些材料？',
  '我双非一本，均分85，想申请英国计算机硕士，应该怎么选校？',
  '申请英国计算机硕士时，CV里的项目经历应该怎么写？',
  '这个 EduAgent 项目里的 RAG 是怎么做检索和重排的？',
];


type InquiryType = 'school_plan' | 'materials' | 'cv' | 'ps' | 'tech_explain';

interface ChatFormState {
  name: string;
  degree: string;
  country: string;
  major: string;
  cgpa: string;
  scale: string;
  budget: string;
  languageType: string;
  languageScore: string;
  background: string;
  concern: string;
  inquiryType: InquiryType;
}

const defaultChatForm: ChatFormState = {
  name: '学生A',
  degree: '硕士',
  country: '英国',
  major: '计算机科学',
  cgpa: '85',
  scale: '100',
  budget: '35万人民币',
  languageType: 'IELTS',
  languageScore: '6.5',
  background: '双非一本计算机相关专业，有机器学习课程项目、Web 全栈项目和一段实习。',
  concern: '希望冲一部分排名更高的学校，同时保证匹配和保底选择。',
  inquiryType: 'school_plan',
};

const inquiryTypes: Array<{ key: InquiryType; label: string; desc: string }> = [
  { key: 'school_plan', label: '选校方案', desc: '三档选校 + 风险 + 时间线' },
  { key: 'materials', label: '材料清单', desc: '成绩单 / PS / CV / 推荐信' },
  { key: 'cv', label: 'CV 包装', desc: '项目经历和技术栈表达' },
  { key: 'ps', label: 'PS 主线', desc: '申请动机和专业匹配' },
  { key: 'tech_explain', label: '项目讲解', desc: 'RAG / Agent / 可观测性' },
];

const chatPresets: Array<{ label: string; form: ChatFormState }> = [
  { label: '双非｜均分85｜英国 CS', form: defaultChatForm },
  {
    label: 'APU｜CGPA 3.2｜英国 DS',
    form: {
      name: 'Chris', degree: '硕士', country: '英国', major: '数据科学', cgpa: '3.2', scale: '4', budget: '35万人民币', languageType: 'IELTS', languageScore: '6.5',
      background: '马来西亚 APU 计算机本科，有软件项目、AI/数据项目和实习经历。',
      concern: 'GPA 不算高，希望用项目经历和文书提升竞争力。', inquiryType: 'school_plan',
    },
  },
  {
    label: '新加坡国立｜CGPA 3.8｜英国 CS',
    form: {
      name: '学生B', degree: '硕士', country: '英国', major: '计算机科学', cgpa: '3.8', scale: '4', budget: '50万人民币以上', languageType: 'IELTS', languageScore: '7.0',
      background: '新加坡国立大学计算机相关本科，有数据结构、机器学习、Web 全栈和科研项目经历。',
      concern: '希望冲刺 G5 或英国头部项目，同时保留匹配选择。', inquiryType: 'school_plan',
    },
  },
  {
    label: '材料清单｜英国 CS',
    form: { ...defaultChatForm, inquiryType: 'materials', concern: '想确认递交前需要准备哪些材料，以及哪些材料容易漏。' },
  },
];

function composeQuestion(form: ChatFormState) {
  const language = buildLanguage(form.languageType, form.languageScore);
  const profile = `${form.name || '学生'}，${form.degree || '硕士'}申请，目标${form.country || '英国'}${form.major || '计算机科学'}，成绩 ${form.cgpa || '-'} / ${form.scale || '-'}，语言 ${language}，预算 ${form.budget || '待定'}。背景：${form.background || '待补充'}。顾虑：${form.concern || '待补充'}。`;

  if (form.inquiryType === 'materials') {
    return `${profile}\n请输出申请材料清单，按必交材料、条件材料、时间节点、容易遗漏的风险项整理。`;
  }
  if (form.inquiryType === 'cv') {
    return `${profile}\n请重点分析 CV 应该如何包装项目经历、技术栈、实习和 GitHub/作品集，并给出可复制的 CV bullet 思路。`;
  }
  if (form.inquiryType === 'ps') {
    return `${profile}\n请给出 Personal Statement 主线、段落结构、需要强调的专业匹配点和应该避免的表达。`;
  }
  if (form.inquiryType === 'tech_explain') {
    return '请用面试官视角解释 EduAgent 项目的 RAG、Agent 工具编排、评测指标、日志可观测性、EdgeOne/Render 部署和 fallback 设计，说明为什么它是一个 AI 应用全栈项目。';
  }
  return `${profile}\n请给出三档选校方案：冲刺、匹配、保底，并说明判断依据、材料补强策略、时间线和下一步动作。`;
}

function failureMessage(err: any) {
  const message = err?.response?.data?.message || err?.response?.data?.error || err?.message || '请求失败，请稍后重试。';
  return `AI 对话请求未完整返回：${message}\n${explainApiFailure(message)}`;
}

function cleanText(text?: unknown) {
  return toDisplayText(text)
    .replace(/\*\*/g, '')
    .replace(/###/g, '')
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();
}

function schoolDisplayName(school: SchoolAdvice) {
  return [school.nameZh, school.nameEn].filter(Boolean).join(' / ') || school.name;
}

function schoolDisplayMajor(school: SchoolAdvice) {
  return school.major || [school.majorZh, school.majorEn].filter(Boolean).join(' / ');
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

function normalizeReadableSourceText(value: unknown) {
  return cleanText(value)
    .replace(/\r\n/g, '\n')
    .replace(/\s*#{1,6}\s*/g, '\n')
    .replace(/\s+标签[:：]/g, '\n标签：')
    .replace(/\s+适用对象\s*/g, '\n适用对象：')
    .replace(/\s+英国计算机硕士通常关注什么\s*/g, '\n英国计算机硕士通常关注什么：')
    .replace(/\s+三档定位逻辑\s*/g, '\n三档定位逻辑：')
    .replace(/\s+(?=(学校|院校|专业|项目|档位|初筛成功率|成功率|适合背景|判断依据|主要风险|补强建议|下一步动作|推荐理由|风险边界)[:：])/g, '\n')
    .replace(/\s+[–—-]\s+/g, '\n- ')
    .replace(/([。；;])\s+(?=(\d+[.、]|[一二三四五六七八九十]+[.、]|[-–—]))/g, '$1\n')
    .replace(/\s+(?=\d+[.、]\s*)/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function ReadableTextBlock({ value, source = false }: { value: unknown; source?: boolean }) {
  const text = source ? normalizeReadableSourceText(value) : cleanText(value);
  if (!text) return <p className="pre-line compact-text-block">暂无内容</p>;

  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (source && lines.length > 1) {
    return (
      <div className="source-readable-block">
        {lines.map((line, index) => {
          const isList = /^[-•]/.test(line) || /^\d+[.、]/.test(line);
          const isHeading = !isList && (/[:：]$/.test(line) || line.length <= 28 && /(标签|适用对象|定位逻辑|关注什么|材料|专业|院校|学校|项目|成功率|风险|建议|动作)/.test(line));
          return (
            <p key={`${index}-${line.slice(0, 12)}`} className={isList ? 'source-readable-line list-like' : isHeading ? 'source-readable-line heading-like' : 'source-readable-line'}>
              {line.replace(/^[-•]\s*/, '')}
            </p>
          );
        })}
      </div>
    );
  }

  return <p className="pre-line compact-text-block">{text}</p>;
}

function DisplayValue({ value, source = false }: { value: unknown; source?: boolean }) {
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
  return <ReadableTextBlock value={parsed} source={source} />;
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
    <FoldSection
      title={cleanText(source.documentTitle || source.title || `来源 ${index + 1}`)}
      subtitle={`score ${cleanText(source.score) || '-'} · ${cleanText(source.retrievalMode || 'unknown')}`}
      defaultOpen={index === 0}
      className="inner-fold-card source-card-v14"
      bodyClassName="source-card-body-v14"
    >
      <div className="tag-row source-debug-row source-debug-row-v14">
        {metaItems.map(([key, value]) => <span key={String(key)}>{String(key)}: {cleanText(value)}</span>)}
      </div>
      <DisplayValue value={source.content || source.chunk || source.text} source />
    </FoldSection>
  );
}

function RuntimeStatusCard({ deployment }: { deployment?: DeploymentInfo }) {
  if (!deployment) return null;
  const live = deployment.mode === 'live_api';
  return (
    <div className={live ? 'runtime-banner live' : 'runtime-banner fallback'}>
      <div>
        <strong>{live ? '真实后端已连接' : '这次先展示备用回答'}</strong>
        <span>{live ? '回答来自后端 RAG / AI 链路。' : describeDeployment(deployment)}</span>
      </div>
      <em>{deployment.latencyMs ? `${deployment.latencyMs}ms` : ''}</em>
    </div>
  );
}

function ObservabilityCard({ result }: { result: ChatResult }) {
  const obs = result.observability;
  if (!obs) return null;

  const modeText = cleanText(obs.answerMode || result.answerMode || '-');
  const retrievalModes = Array.isArray(obs.retrievalModes) && obs.retrievalModes.length ? obs.retrievalModes.join(' / ') : '-';
  const scoreText = Array.isArray(obs.ragScores) && obs.ragScores.length ? obs.ragScores.map((score) => Number(score).toFixed(2)).join(', ') : '-';

  return (
    <SectionGroup title="调用情况" subtitle="耗时、命中、缓存和备用结果" defaultOpen>
      <div className="smart-object-grid observability-grid">
        <div className="smart-object-cell"><span>回答模式</span><strong>{modeText}</strong></div>
        <div className="smart-object-cell"><span>检索模式</span><strong>{retrievalModes}</strong></div>
        <div className="smart-object-cell"><span>检索耗时</span><strong>{formatMs(obs.retrievalLatencyMs)}</strong></div>
        <div className="smart-object-cell"><span>模型耗时</span><strong>{formatMs(obs.llmLatencyMs)}</strong></div>
        <div className="smart-object-cell"><span>总耗时</span><strong>{formatMs(obs.totalLatencyMs)}</strong></div>
        <div className="smart-object-cell"><span>RAG 命中</span><strong>{obs.ragHitCount ?? result.sources?.length ?? 0}</strong></div>
        <div className="smart-object-cell"><span>缓存</span><strong>{obs.cacheHit ? 'Hit' : 'Miss'}</strong></div>
        <div className="smart-object-cell"><span>备用结果</span><strong>{obs.fallbackTriggered ? (obs.fallbackReason || '已触发') : '未触发'}</strong></div>
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
                  <FoldSection
                    title={`${school.rank ? `${school.rank}. ` : ''}${cleanText(schoolDisplayName(school))}`}
                    subtitle={[cleanText(tier.tier), school.successRate ? `初筛成功率 ${cleanText(school.successRate)}` : ''].filter(Boolean).join(' · ')}
                    key={`${tier.tier}-${school.name}-${index}`}
                    defaultOpen
                    className="inner-fold-card"
                  >
                    <div className="school-detail"><span>推荐专业</span><p>{cleanText(schoolDisplayMajor(school) || '待结合官网项目列表确认')}</p></div>
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
  const [form, setForm] = useState<ChatFormState>(defaultChatForm);
  const [question, setQuestion] = useState(() => composeQuestion(defaultChatForm));
  const [manualQuestion, setManualQuestion] = useState(false);
  const [result, setResult] = useState<ChatResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [error, setError] = useState('');

  function updateForm(patch: Partial<ChatFormState>) {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      if (!manualQuestion) setQuestion(composeQuestion(next));
      return next;
    });
  }

  function applyPreset(preset: ChatFormState) {
    setManualQuestion(false);
    setForm(preset);
    setQuestion(composeQuestion(preset));
    setResult(null);
    setError('');
  }

  useEffect(() => {
    let alive = true;
    const cached = readSessionState<any>(CHAT_STORAGE_KEY, {});
    if (cached.form) setForm({ ...defaultChatForm, ...cached.form });
    if (cached.question) setQuestion(cached.question);
    if (cached.manualQuestion !== undefined) setManualQuestion(Boolean(cached.manualQuestion));
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
          setError(failureMessage(err));
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
    persistChatSnapshot({ question, result, conversations, form, manualQuestion });
  }, [question, result, conversations, form, manualQuestion]);

  const structured = useMemo(() => {
    if (!result) return null;
    if (result.answerMode !== 'school_plan') return null;
    if (result.structured) return result.structured;
    return tryParseStructuredAnswer(result.rawAnswer) || tryParseStructuredAnswer(result.answer) || null;
  }, [result]);

  async function ask(e: FormEvent) {
    e.preventDefault();
    const preparedQuestion = question.trim() || composeQuestion(form);
    if (!preparedQuestion.trim()) {
      setError('请输入问题或完善学生画像。');
      return;
    }
    setQuestion(preparedQuestion);
    setLoading(true);
    setError('');
    const currentQuestion = preparedQuestion;
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
      const shouldSyncAdvisor = data.answerMode === 'school_plan' || Boolean(data.structured);
      if (shouldSyncAdvisor) {
        const bridgedProfile = profileFromChat(currentQuestion, data);
        mergeToolsDraft(bridgedProfile, { active: 'advisor' });
        if (!isGuest) {
          runAdvisorInBackground(api, bridgedProfile);
        }
      }
      if (data.quota && isGuest && user) {
        setUser({ ...user, quotaLimit: data.quota.limit, quotaRemaining: data.quota.remaining });
      }
      setConversations(convData);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.response?.data?.error || err?.message || '请求失败，请稍后重试。';
      setError(failureMessage(err));
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
          <h1>AI 咨询工作台</h1>
          <p>可以问申请材料、文书、语言、选校和项目包装；选校类问题会同步到方案引擎，方便继续拆方案。</p>
        </div>
        <div className="model-badge">{isGuest ? `访客额度 ${user?.quotaRemaining ?? '-'} / ${user?.quotaLimit ?? '-'}` : '后端已连接'} · v11</div>
      </div>

      <div className="prompt-panel chat-intake-panel-v12">
        <form onSubmit={ask} className="prompt-box chat-intake-form-v12">
          <div className="chat-intake-head-v12">
            <div>
              <span className="eyebrow">结构化录入</span>
              <h2>学生画像 + 咨询类型</h2>
              <p>先把学生背景整理清楚，再让 AI 根据画像生成更具体的问题和回答。</p>
            </div>
            <button className="ghost-button" type="button" onClick={() => applyPreset(defaultChatForm)}>重置案例</button>
          </div>

          <div className="chat-mode-grid-v12">
            {inquiryTypes.map((item) => (
              <button type="button" key={item.key} className={form.inquiryType === item.key ? 'active' : ''} onClick={() => updateForm({ inquiryType: item.key })}>
                <strong>{item.label}</strong><span>{item.desc}</span>
              </button>
            ))}
          </div>

          <div className="form-grid two chat-form-grid-v12">
            <label>学生称呼<input value={form.name} onChange={(e) => updateForm({ name: e.target.value })} /></label>
            <label>申请学位<select value={form.degree} onChange={(e) => updateForm({ degree: e.target.value })}>{degreeOptions.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
            <label>GPA / CGPA / 均分<input value={form.cgpa} onChange={(e) => updateForm({ cgpa: e.target.value })} /></label>
            <label>满分制<select value={form.scale} onChange={(e) => updateForm({ scale: e.target.value })}><option value="4">4.0</option><option value="5">5.0</option><option value="100">100</option></select></label>
            <label>目标国家<select value={form.country} onChange={(e) => updateForm({ country: e.target.value })}>{countryOptions.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
            <label>目标专业<select value={form.major} onChange={(e) => updateForm({ major: e.target.value })}>{majorOptions.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
            <label>语言类型<select value={form.languageType} onChange={(e) => updateForm({ languageType: e.target.value })}>{languageTypeOptions.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
            <label>语言分数<input value={form.languageScore} onChange={(e) => updateForm({ languageScore: e.target.value })} disabled={form.languageType === '暂无'} /></label>
            <label>预算<select value={form.budget} onChange={(e) => updateForm({ budget: e.target.value })}>{budgetOptions.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
          </div>

          <label>项目 / 实习 / 课程经历<textarea value={form.background} onChange={(e) => updateForm({ background: e.target.value })} /></label>
          <label>主要顾虑<textarea value={form.concern} onChange={(e) => updateForm({ concern: e.target.value })} /></label>

          <div className="quick-fill-panel chat-quick-fill-v12"><strong>快速画像</strong><div className="example-row">{chatPresets.map((preset) => <button type="button" key={preset.label} onClick={() => applyPreset(preset.form)}>{preset.label}</button>)}</div></div>

          <label>自动生成的咨询问题<textarea className="question-preview-v12" value={question} onChange={(e) => { setManualQuestion(true); setQuestion(e.target.value); }} placeholder="系统会根据上方画像自动生成，也可以手动改写。" /></label>
          <div className="example-row">{examples.map((item) => <button type="button" key={item} onClick={() => { setManualQuestion(true); setQuestion(item); }}>{item.slice(0, 18)}...</button>)}</div>
          <button className="primary ask-button" disabled={loading}>{loading ? 'AI 生成中…' : '开始咨询'}</button>
          {loading && <p className="muted-text">{AI_LOADING_HINT}</p>}
        </form>
      </div>

      {error && <div className="error-card"><strong>请求失败</strong><p>{error}</p></div>}
      {result?.deployment && <RuntimeStatusCard deployment={result.deployment} />}
      {!result && !loading && !error && <EmptyState />}
      {loading && <div className="loading-card"><div className="loader-dot" /><div><strong>正在检索知识库并生成回答</strong><p>{AI_LOADING_HINT}</p></div></div>}

      {structured && <StructuredResult data={structured} />}

      {result && !structured && (
        <FoldSection title="AI 回答" defaultOpen>
          <TextBlock value={result.answer} />
        </FoldSection>
      )}

      {result && (
        <div className="meta-grid meta-grid-v13">
          <ObservabilityCard result={result} />

          <SectionGroup title="工具调用" subtitle="选校、GPA、销售话术等问题会触发" defaultOpen>
            <div className="meta-card-grid-v13">
              {result.toolCalls?.length ? result.toolCalls.map((t, i) => <ToolCallCard call={t} index={i} key={i} />) : <p className="muted-text">本次是知识库问答，没有触发额外工具。</p>}
            </div>
          </SectionGroup>

          <SectionGroup title="来源引用" subtitle="AI 回答参考了哪些知识库内容" defaultOpen>
            <div className="meta-card-grid-v13">
              {result.sources?.length ? result.sources.map((s, i) => <SourceCard source={s} index={i} key={s.id || i} />) : <p className="muted-text">暂无来源引用。</p>}
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
