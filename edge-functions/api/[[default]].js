const DEMO_SOURCES = [
  {
    id: 'demo-src-materials',
    rank: 1,
    documentTitle: '02_英国硕士申请材料清单',
    title: '02_英国硕士申请材料清单',
    content: '英国计算机硕士常见申请材料包括：成绩单、在读证明或毕业证学位证、个人陈述 PS、CV、推荐信、语言成绩、护照、作品集或项目补充材料。不同学校可能要求课程描述、评分标准或 WES/学信网材料。',
    score: 0.94,
    vectorScore: 0.88,
    keywordScore: 0.97,
    hybridBoost: 0.22,
    intentLockWeight: 0.31,
    retrievalMode: 'demo-hybrid',
    candidateSource: 'edgeone-demo-fallback',
  },
  {
    id: 'demo-src-overview',
    rank: 2,
    documentTitle: '01_英国计算机硕士申请总览',
    title: '01_英国计算机硕士申请总览',
    content: '英国计算机硕士申请通常围绕院校背景、成绩、专业匹配、项目经历、文书、推荐信和语言成绩综合判断，材料准备需要和选校策略同步推进。',
    score: 0.87,
    vectorScore: 0.82,
    keywordScore: 0.84,
    hybridBoost: 0.16,
    intentLockWeight: 0.22,
    retrievalMode: 'demo-hybrid',
    candidateSource: 'edgeone-demo-fallback',
  },
  {
    id: 'demo-src-cv',
    rank: 3,
    documentTitle: '07_CV简历与项目包装指南',
    title: '07_CV简历与项目包装指南',
    content: 'CV 中应突出课程、项目、技术栈、实习、科研或竞赛经历。计算机方向建议把项目写成问题背景、技术方案、个人贡献和结果指标。',
    score: 0.79,
    vectorScore: 0.74,
    keywordScore: 0.78,
    hybridBoost: 0.11,
    intentLockWeight: 0.12,
    retrievalMode: 'demo-hybrid',
    candidateSource: 'edgeone-demo-fallback',
  },
];

const DEMO_EVAL_QUESTIONS = [
  ['英国计算机硕士申请一般需要提交哪些材料？', '02_英国硕士申请材料清单|英国硕士申请 FAQ'],
  ['英国计算机硕士申请整体要看哪些背景因素？', '01_英国计算机硕士申请总览'],
  ['APU 或马来西亚本科 CGPA 3.2 申请英国计算机硕士竞争力如何解释？', '03_CGPA|16_马来西亚本科背景'],
  ['低 GPA 申请英国计算机硕士，Personal Statement 应该怎么写？', '06_Personal|文书写作'],
  ['CV 简历和项目经历应该如何包装，才能增强计算机硕士申请？', '07_CV|项目包装'],
  ['推荐信应该找谁写，英国硕士申请推荐信怎么准备？', '08_推荐信|推荐信准备'],
  ['雅思、托福或语言成绩不够时，英国硕士申请可以怎么处理？', '09_语言|语言成绩|语言班'],
  ['英国计算机硕士选校怎么分冲刺、匹配和保底？', '05_英国计算机硕士选校|选校分层'],
].map((item, index) => ({ id: `demo-q-${index + 1}`, question: item[0], expectedSource: item[1] }));

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=UTF-8',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'access-control-allow-headers': 'authorization,content-type,x-requested-with',
      ...extraHeaders,
    },
  });
}

function nowIso() {
  return new Date().toISOString();
}

function readQuestion(body) {
  if (!body || typeof body !== 'object') return '英国计算机硕士申请一般需要提交哪些材料？';
  return String(body.question || body.prompt || body.input || '英国计算机硕士申请一般需要提交哪些材料？').trim();
}

function isSchoolPlan(question) {
  return /(选校|冲刺|匹配|保底|院校|学校|排名|申请.*哪些大学|推荐.*大学)/.test(question) && !/(材料|推荐信|CV|简历|PS|个人陈述|语言|雅思|托福)/i.test(question);
}

function materialAnswer() {
  return [
    '英国计算机硕士申请一般需要准备这些材料：',
    '',
    '1. 学术材料：中英文成绩单、在读证明或毕业证 / 学位证、评分标准；部分学校可能要求课程描述。',
    '2. 文书材料：Personal Statement、CV、1-2 封推荐信。PS 重点解释申请动机、专业匹配、项目经历和未来规划。',
    '3. 语言材料：IELTS / TOEFL / PTE 等成绩；如果暂时不够，可以先递交申请，后续补语言或申请语言班。',
    '4. 身份与补充材料：护照、申请表、作品集或 GitHub / 项目链接；计算机方向建议补充项目经历和技术栈。',
    '5. 申请策略：不同学校要求会变，递交前要逐项核对官网 checklist，避免漏传推荐信、课程描述或语言条件。',
    '',
    '这个回答来自国内入口版的 Demo Fallback。Render 后端可用时，系统会优先返回真实 RAG 检索结果。',
  ].join('\n');
}

function schoolPlanAnswer() {
  return JSON.stringify({
    summary: '双非一本、均分 85 申请英国计算机硕士属于可冲中上梯队，核心策略是用项目经历和课程匹配度补强。',
    profile: {
      education: '双非一本，本科背景需要通过成绩、项目和文书解释竞争力',
      gpa: '均分 85，具备申请主流英国计算机硕士的基础竞争力',
      targetCountry: '英国',
      targetMajor: '计算机科学 / 数据科学 / AI 相关方向',
      budget: '建议结合伦敦与非伦敦城市成本分层',
      competitiveness: '成绩可用，关键看项目、课程匹配、语言和文书表达',
    },
    schoolTiers: [
      { tier: '冲刺', level: '高排名 / 高竞争', strategy: '选择 2-3 所课程匹配强但录取不确定的学校', schools: [{ name: 'Manchester / Bristol / Glasgow 等同档方向', reason: '计算机方向认可度较高', fit: '成绩达到基础门槛，需要项目增强', risk: '双非背景和热门专业竞争较高', action: '强化 CV、PS 和项目描述' }] },
      { tier: '匹配', level: '主力申请', strategy: '选择 3-4 所录取概率和项目匹配度较平衡的学校', schools: [{ name: 'Leeds / Nottingham / Southampton 等同档方向', reason: '对 85 分背景更友好', fit: '适合作为主申梯队', risk: '具体专业仍需看先修课', action: '核对课程要求和语言条件' }] },
      { tier: '保底', level: '安全录取', strategy: '选择 1-2 所保证 offer 概率的学校', schools: [{ name: 'Queen Mary / Cardiff / Newcastle 等同档方向', reason: '整体风险更可控', fit: '适合作为兜底选择', risk: '仍需避免过度热门分支', action: '优先递交材料完整的申请' }] },
    ],
    timeline: [
      { phase: '准备材料', time: '申请前 1-2 个月', tasks: ['整理成绩单和在读证明', '准备 CV / PS / 推荐信', '确定三档选校'] },
      { phase: '递交申请', time: '开放后尽早', tasks: ['优先递交热门专业', '跟踪补件和语言条件'] },
    ],
    risks: ['热门计算机专业竞争高', '双非背景需要项目和文书补强', '语言成绩可能影响最终入学'],
    nextActions: ['整理课程与项目清单', '确定 8-10 所学校', '准备 PS 和推荐信初稿'],
    disclaimer: '以上为项目演示建议，最终以学校官网和当年招生要求为准。',
  }, null, 2);
}

function makeChatFallback(body, reason) {
  const question = readQuestion(body);
  const school = isSchoolPlan(question);
  const answerMode = school ? 'school_plan' : 'grounded_qa';
  const rawAnswer = school ? schoolPlanAnswer() : materialAnswer();
  const structured = school ? JSON.parse(rawAnswer) : null;
  const sources = school
    ? [
        { ...DEMO_SOURCES[1], id: 'demo-src-school-overview', rank: 1, documentTitle: '05_英国计算机硕士选校分层策略', title: '05_英国计算机硕士选校分层策略', content: '按 GPA、院校背景、专业匹配、项目经历和语言情况拆分冲刺、匹配、保底梯队。', score: 0.92 },
        DEMO_SOURCES[1],
        DEMO_SOURCES[2],
      ]
    : DEMO_SOURCES;

  return {
    answer: school ? '已生成结构化三档选校方案。' : rawAnswer,
    rawAnswer,
    answerMode,
    structured,
    sources,
    toolCalls: school ? [{ name: 'weighted-fit 选校评分', status: 'demo_fallback', result: { tiers: ['冲刺', '匹配', '保底'], note: 'EdgeOne fallback 展示，真实后端可用时会返回 Render 计算结果。' } }] : [],
    conversationId: 'edgeone-demo-conversation',
    quota: { limit: 20, used: 1, remaining: 19 },
    observability: {
      requestId: `edgeone-demo-${Date.now()}`,
      retrievalLatencyMs: 28,
      llmLatencyMs: 0,
      totalLatencyMs: 36,
      ragHitCount: sources.length,
      ragScores: sources.map((item) => item.score),
      cacheHit: false,
      answerMode,
      retrievalModes: ['edgeone-demo-hybrid'],
      fallbackTriggered: true,
      fallbackReason: reason || 'render_unavailable',
    },
    deployment: deploymentInfo('demo_fallback', reason),
  };
}

function makeRetrieveFallback(body, reason) {
  const question = readQuestion(body);
  return {
    question,
    topK: 3,
    sources: DEMO_SOURCES,
    retrieved: DEMO_SOURCES,
    retrievalMode: 'edgeone-demo-hybrid',
    fallbackTriggered: true,
    fallbackReason: reason || 'render_unavailable',
    deployment: deploymentInfo('demo_fallback', reason),
  };
}

function makeEvalResults(reason) {
  const results = DEMO_EVAL_QUESTIONS.map((item, index) => ({
    id: `demo-eval-${index + 1}`,
    question: item.question,
    expectedSource: item.expectedSource,
    hit: true,
    top1Hit: index !== 2,
    top3Hit: true,
    firstHitRank: index === 2 ? 2 : 1,
    mrr: index === 2 ? 0.5 : 1,
    latency: 32 + index * 8,
    cacheHit: index > 3,
    retrievalModes: ['edgeone-demo-hybrid'],
    maxScore: 0.92 - index * 0.02,
    retrieved: index === 7 ? [
      { ...DEMO_SOURCES[1], documentTitle: '05_英国计算机硕士选校分层策略', title: '05_英国计算机硕士选校分层策略', score: 0.92 },
      DEMO_SOURCES[1],
      DEMO_SOURCES[2],
    ] : DEMO_SOURCES,
  }));

  return {
    summary: {
      total: results.length,
      hitRate: 1,
      hitAt1: 0.875,
      hitAt3: 1,
      mrr: 0.938,
      avgLatency: 60,
      p95Latency: 92,
      cacheHitRate: 0.5,
    },
    results,
    deployment: deploymentInfo('demo_fallback', reason),
  };
}

function makeLogs() {
  return [
    {
      id: 'edgeone-log-1',
      type: 'chat',
      question: '英国计算机硕士申请一般需要提交哪些材料？',
      model: 'EdgeOne Demo Fallback / Render Proxy',
      success: true,
      status: 'success',
      durationMs: 36,
      ragHitCount: 3,
      retrievalLatencyMs: 28,
      llmLatencyMs: 0,
      ragScores: [0.94, 0.87, 0.79],
      cacheHit: false,
      fallbackTriggered: true,
      fallbackReason: 'render_unavailable',
      toolNames: [],
      createdAt: nowIso(),
    },
    {
      id: 'edgeone-log-2',
      type: 'eval',
      question: '运行 Top-3 RAG 评测',
      model: 'EdgeOne Demo Evaluation',
      success: true,
      status: 'success',
      durationMs: 92,
      ragHitCount: 8,
      retrievalLatencyMs: 60,
      llmLatencyMs: 0,
      ragScores: [0.92, 0.88, 0.83],
      cacheHit: true,
      fallbackTriggered: true,
      fallbackReason: 'render_unavailable',
      toolNames: ['RAG Evaluation'],
      createdAt: nowIso(),
    },
  ];
}

function deploymentInfo(mode, reason, latencyMs, target) {
  return {
    mode,
    backend: mode === 'live_api' ? 'Render via EdgeOne Proxy' : 'EdgeOne Demo Fallback',
    proxy: 'EdgeOne Pages Functions',
    fallback: mode !== 'live_api',
    reason: reason || null,
    latencyMs: latencyMs ?? null,
    target: target || null,
  };
}

function fallbackFor(pathname, method, body, reason) {
  if (pathname === '/api/health') {
    return json({
      status: 'ok',
      service: 'eduagent-edgeone-entry',
      renderStatus: 'fallback',
      ragVersion: 'v11-edgeone-live-proxy-fallback',
      deployment: deploymentInfo('demo_fallback', reason),
    });
  }

  if (pathname === '/api/auth/guest' && method === 'POST') {
    return json({
      token: 'edgeone-demo-token',
      user: { id: 'edgeone_guest', username: 'guest', displayName: '访客体验', role: 'guest', quotaLimit: 20, quotaRemaining: 19 },
      deployment: deploymentInfo('demo_fallback', reason),
    });
  }

  if (pathname === '/api/auth/profile') {
    return json({ id: 'edgeone_guest', username: 'guest', displayName: '访客体验', role: 'guest', quotaLimit: 20, quotaRemaining: 19, deployment: deploymentInfo('demo_fallback', reason) });
  }

  if (pathname === '/api/chat/conversations') {
    return json([{ id: 'edgeone-demo-conversation', title: 'EdgeOne 国内入口演示会话', updatedAt: nowIso() }]);
  }

  if (pathname === '/api/chat' && method === 'POST') return json(makeChatFallback(body, reason));
  if (pathname === '/api/chat/retrieve' && method === 'POST') return json(makeRetrieveFallback(body, reason));

  if (pathname === '/api/eval/questions') return json(DEMO_EVAL_QUESTIONS);
  if (pathname === '/api/eval/results') return json(makeEvalResults(reason));
  if (pathname === '/api/eval/run' && method === 'POST') return json(makeEvalResults(reason));

  if (pathname === '/api/tools/logs') return json(makeLogs());
  if (pathname === '/api/tools/overview') {
    const logs = makeLogs();
    return json({
      totalCalls: logs.length,
      successRate: 1,
      avgDurationMs: 64,
      avgRagHitCount: 5.5,
      latestLogs: logs,
      toolUsage: [{ name: 'RAG Evaluation', count: 1 }, { name: 'AI 咨询', count: 1 }],
      deployment: deploymentInfo('demo_fallback', reason),
    });
  }
  if (pathname === '/api/tools/client-error-log' && method === 'POST') return json({ ok: true, deployment: deploymentInfo('demo_fallback', reason) });

  if (pathname === '/api/documents') return json([
    { id: 'demo-doc-02', title: '02_英国硕士申请材料清单', fileName: 'clean-kb-v1.md', status: 'parsed', chunkCount: 8, createdAt: nowIso() },
    { id: 'demo-doc-01', title: '01_英国计算机硕士申请总览', fileName: 'clean-kb-v1.md', status: 'parsed', chunkCount: 6, createdAt: nowIso() },
    { id: 'demo-doc-07', title: '07_CV简历与项目包装指南', fileName: 'clean-kb-v1.md', status: 'parsed', chunkCount: 5, createdAt: nowIso() },
  ]);
  if (pathname === '/api/documents/stats') return json({ totalDocuments: 12, totalChunks: 64, parsedDocuments: 12, recentDocuments: [
    { id: 'demo-doc-02', title: '02_英国硕士申请材料清单', fileName: 'clean-kb-v1.md', status: 'parsed', chunkCount: 8, createdAt: nowIso() },
    { id: 'demo-doc-05', title: '05_英国计算机硕士选校分层策略', fileName: 'clean-kb-v1.md', status: 'parsed', chunkCount: 7, createdAt: nowIso() },
  ], deployment: deploymentInfo('demo_fallback', reason) });

  return json({
    ok: true,
    message: 'EdgeOne demo fallback：该接口在完整 Render 后端可用时会返回真实结果。',
    path: pathname,
    method,
    deployment: deploymentInfo('demo_fallback', reason),
  });
}

async function readJsonSafely(request) {
  const text = await request.text().catch(() => '');
  if (!text) return { body: undefined, raw: '' };
  try {
    return { body: JSON.parse(text), raw: text };
  } catch {
    return { body: undefined, raw: text };
  }
}

function makeTargetUrl(request, env) {
  const base = env?.RENDER_API_BASE_URL || env?.EDUAGENT_API_BASE_URL || env?.VITE_API_BASE_URL || '';
  if (!base) return null;
  const incoming = new URL(request.url);
  const target = new URL(base.replace(/\/$/, '') + incoming.pathname.replace(/^\/api/, '') + incoming.search);
  return target;
}

function shouldSkipLiveProxy(request, pathname) {
  const auth = request.headers.get('authorization') || '';
  if (/edgeone-demo-token/i.test(auth)) return true;
  if (pathname === '/api/auth/profile' && !auth) return true;
  return false;
}

async function proxyToRender(request, env, rawBody) {
  const target = makeTargetUrl(request, env);
  if (!target) throw new Error('missing_RENDER_API_BASE_URL');

  const controller = new AbortController();
  const timeoutMs = Number(env?.EDGEONE_PROXY_TIMEOUT_MS || 7500);
  const timer = setTimeout(() => controller.abort('edgeone_proxy_timeout'), timeoutMs);
  const headers = new Headers(request.headers);
  headers.set('host', target.host);
  if (/edgeone-demo-token/i.test(headers.get('authorization') || '')) headers.delete('authorization');

  try {
    const started = Date.now();
    const response = await fetch(target.toString(), {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : rawBody,
      signal: controller.signal,
    });
    const latencyMs = Date.now() - started;
    const contentType = response.headers.get('content-type') || '';
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('access-control-allow-origin', '*');
    responseHeaders.set('x-eduagent-runtime-mode', 'live_api');
    responseHeaders.set('x-eduagent-proxy', 'edgeone-functions');

    if (contentType.includes('application/json')) {
      const data = await response.json().catch(() => null);
      if (response.ok && data && typeof data === 'object' && !Array.isArray(data)) {
        data.deployment = deploymentInfo('live_api', null, latencyMs, target.origin);
      }
      return json(data, response.status, Object.fromEntries(responseHeaders.entries()));
    }

    return new Response(response.body, { status: response.status, headers: responseHeaders });
  } finally {
    clearTimeout(timer);
  }
}

async function handleRequest(context) {
  try {
    const request = context?.request;
    const env = context?.env || {};

    if (!request) {
      return json({
        ok: false,
        message: 'Missing request in EdgeOne function context.',
        deployment: deploymentInfo('demo_fallback', 'missing_request_context'),
      }, 200);
    }

    if (request.method === 'OPTIONS') return json({ ok: true });

    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method.toUpperCase();
    const { body, raw } = await readJsonSafely(request.clone());

    if (!pathname.startsWith('/api')) {
      return fallbackFor('/api/health', method, body, 'not_api_route');
    }

    if (!shouldSkipLiveProxy(request, pathname)) {
      try {
        return await proxyToRender(request, env, raw);
      } catch (error) {
        return fallbackFor(pathname, method, body, error?.message || 'render_proxy_failed');
      }
    }

    return fallbackFor(pathname, method, body, 'demo_token_or_no_auth');
  } catch (error) {
    return json({
      ok: false,
      message: 'EdgeOne function crashed before fallback.',
      error: error?.message || String(error),
      deployment: deploymentInfo('demo_fallback', 'edge_function_runtime_error'),
    }, 200);
  }
}

export default handleRequest;
export const onRequest = handleRequest;
