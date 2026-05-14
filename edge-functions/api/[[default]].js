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
    candidateSource: 'domestic-entry-backup',
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
    candidateSource: 'domestic-entry-backup',
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
    candidateSource: 'domestic-entry-backup',
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
    '这是一份备用展示结果；海外后端连上后，系统会优先返回真实 RAG 检索结果。',
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
    toolCalls: school ? [{ name: 'weighted-fit 选校评分', status: 'demo_fallback', result: { tiers: ['冲刺', '匹配', '保底'], note: '这次先展示备用结果；海外后端可用时会返回真实计算结果。' } }] : [],
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
      model: '备用结果 / Render 后端',
      success: true,
      status: 'success',
      durationMs: 36,
      ragHitCount: 3,
      retrievalLatencyMs: 28,
      llmLatencyMs: 0,
      ragScores: [0.94, 0.87, 0.79],
      cacheHit: false,
      fallbackTriggered: true,
      fallbackReason: '海外后端暂时没有完整返回',
      toolNames: [],
      createdAt: nowIso(),
    },
    {
      id: 'edgeone-log-2',
      type: 'eval',
      question: '运行 Top-3 RAG 评测',
      model: '备用评测结果',
      success: true,
      status: 'success',
      durationMs: 92,
      ragHitCount: 8,
      retrievalLatencyMs: 60,
      llmLatencyMs: 0,
      ragScores: [0.92, 0.88, 0.83],
      cacheHit: true,
      fallbackTriggered: true,
      fallbackReason: '海外后端暂时没有完整返回',
      toolNames: ['RAG Evaluation'],
      createdAt: nowIso(),
    },
  ];
}

function deploymentInfo(mode, reason, latencyMs, target) {
  return {
    mode,
    backend: mode === 'live_api' ? 'Render 后端' : '备用展示结果',
    proxy: 'EdgeOne Pages Functions',
    fallback: mode !== 'live_api',
    reason: reason || null,
    latencyMs: latencyMs ?? null,
    target: target || null,
  };
}


function makeProfileFitFallback(body, reason) {
  const major = body?.major || body?.targetMajor || '计算机科学 / AI';
  const country = body?.country || body?.targetCountry || '英国';
  const gpa = body?.gpa || body?.cgpa || '85';
  const scale = body?.scale || '100';
  const language = body?.language || body?.englishScore || [body?.languageType, body?.languageScore].filter(Boolean).join(' ') || 'IELTS 6.5';

  return {
    algorithm: 'weighted-fit-v2',
    overall: 82,
    band: 'A',
    summary: `当前画像适合申请${country}${major}方向，${gpa}/${scale} 的成绩具备主申基础，建议用项目经历和文书主线补强热门专业竞争力。`,
    factors: [
      { key: 'academic', label: '成绩表现', score: 85, evidence: `GPA / 均分 ${gpa}/${scale} 达到多数主申项目基础区间。` },
      { key: 'major_fit', label: '专业匹配', score: 86, evidence: `${major} 与计算机、AI、数据方向相关，课程匹配度较好。` },
      { key: 'projects', label: '项目经历', score: 84, evidence: '可用全栈项目、RAG / Agent、数据或实习经历支撑 CV 和 PS。' },
      { key: 'language', label: '语言准备', score: 76, evidence: language ? `当前语言信息：${language}，仍需逐校核对小分要求。` : '语言成绩需补齐或后续换无条件 offer。' },
      { key: 'risk_control', label: '风险控制', score: 78, evidence: '热门计算机方向竞争高，需要设置冲刺、匹配、保底三档。' },
    ],
    tierAdvice: { reach: 2, match: 4, safe: 2, strategy: '以匹配院校为主，保留少量冲刺，并用保底项目控制 offer 风险。' },
    hardRisks: [],
    softRisks: ['热门计算机 / AI 方向竞争高', '需要逐校核对先修课程与语言小分', '双非或海外本科背景需要通过项目和文书解释竞争力'],
    risks: ['热门计算机 / AI 方向竞争高，需要尽早递交并准备替代专业。'],
    riskSignals: ['申请轮次越晚，热门方向名额越紧张。'],
    nextActions: ['整理成绩单与课程描述', '补齐 CV / PS / 推荐信素材', '把学校拆成冲刺、匹配、保底三档', '为每所学校核对官网 checklist'],
    llmFallbackReason: '这次没有等到海外后端完整返回，先展示备用内容。',
    deployment: deploymentInfo('demo_fallback', reason),
  };
}

function makeSchoolRecommendFallback(body, reason) {
  const country = body?.country || body?.targetCountry || '英国';
  const major = body?.major || body?.targetMajor || '计算机科学 / AI';
  return {
    summary: `${country}${major}建议采用 2 冲刺 + 4 匹配 + 2 保底 的组合，先保证课程匹配，再看综合排名。`,
    reach: [
      { name: 'University of Manchester / Bristol / Glasgow 同档项目', reason: '学校认可度较高，适合作为冲刺选择。', fit: '均分 85 或 GPA 3.2+ 可尝试，但需要项目经历支撑。', risk: 'CS / AI 方向申请量大，录取不确定性较高。', action: '优先优化 PS 与项目描述。' },
      { name: 'University of Birmingham / Sheffield 热门方向', reason: '计算机相关项目选择多。', fit: '适合有较强项目和课程匹配的申请人。', risk: '需确认先修课程和数学 / 编程要求。', action: '准备课程列表和项目证明。' },
    ],
    match: [
      { name: 'University of Leeds / Nottingham / Southampton 同档项目', reason: '主申梯队，录取概率与项目质量较平衡。', fit: '适合均分 85、项目经历较完整的背景。', risk: '部分专业对算法、数学或编程课程要求明确。', action: '逐校核对 entry requirements。' },
      { name: 'Newcastle / York / Lancaster 同档项目', reason: '适合作为中稳组合补充。', fit: '对背景解释空间更大。', risk: '需要关注专业名称和课程模块差异。', action: '优先选择课程匹配度高的项目。' },
    ],
    safe: [
      { name: 'Cardiff / Queen Mary / Essex / Surrey 同档项目', reason: '用于控制 offer 风险。', fit: '适合作为安全梯队。', risk: '仍需避开过热分支。', action: '准备 1-2 个保底项目，避免全冲。' },
      { name: 'Aston / Sussex / Leicester 同档项目', reason: '可作为更稳妥的兜底选择。', fit: '对转专业或背景解释更友好。', risk: '需平衡排名、预算和就业城市。', action: '结合预算和课程设置最终筛选。' },
    ],
    risk: ['热门 CS / AI 项目滚动录取节奏快', '部分学校会要求相关课程比例', '最终名单必须以当年官网为准'],
    nextActions: ['确定 8-10 所候选学校', '逐校核对课程要求和申请截止时间', '准备文书主线和推荐信素材'],
    llmFallbackReason: '这次没有等到海外后端完整返回，先展示备用内容。',
    deployment: deploymentInfo('demo_fallback', reason),
  };
}

function makeMaterialListFallback(body, reason) {
  const country = body?.country || body?.targetCountry || '英国';
  return {
    required: [
      { name: '中英文成绩单', note: '需包含评分标准；部分学校要求官方盖章或电子认证。' },
      { name: '在读证明 / 毕业证 / 学位证', note: '在读学生提交在读证明，毕业生提交双证。' },
      { name: 'Personal Statement', note: '解释申请动机、专业匹配、项目经历和职业目标。' },
      { name: 'CV / Resume', note: '突出课程、项目、技术栈、实习、科研或竞赛。' },
      { name: '推荐信 1-2 封', note: '优先找课程老师、项目导师或实习主管。' },
      { name: '护照信息页', note: '用于网申身份信息。' },
    ],
    conditional: [
      { name: '语言成绩 IELTS / TOEFL / PTE', note: '可先递交后补，最终以学校条件为准。' },
      { name: '课程描述', note: `${country}部分计算机项目会核对数学、编程、算法等先修课。` },
      { name: '作品集 / GitHub / 项目证明', note: '计算机、AI、数据方向建议补充。' },
      { name: '资金证明', note: '通常签证阶段更重要，个别项目或奖学金可能提前要求。' },
    ],
    optional: ['实习证明', '获奖证书', '科研摘要', '课程项目截图', '个人网站或 GitHub 链接'],
    namingRules: ['Transcript_Name.pdf', 'CV_Name.pdf', 'PS_University_Programme_Name.pdf', 'Recommendation_Name.pdf'],
    timeline: [
      { stage: '申请前 1-2 个月', task: '准备成绩单、CV、PS、推荐信素材。' },
      { stage: '递交前 1 周', task: '逐校核对 checklist 和文件命名。' },
      { stage: '拿到 conditional offer 后', task: '补语言、毕业材料和押金相关文件。' },
    ],
    reminders: ['不同学校材料口径不同，最终以官网和网申系统为准。', '推荐信尽量提前 2-3 周沟通。'],
    llmFallbackReason: '这次没有等到海外后端完整返回，先展示备用内容。',
    deployment: deploymentInfo('demo_fallback', reason),
  };
}

function makeApplicationPlanFallback(body, reason) {
  const name = body?.name || body?.studentName || '申请人';
  const major = body?.major || body?.targetMajor || '计算机科学 / AI';
  const country = body?.country || body?.targetCountry || '英国';
  return {
    writingBrief: {
      psTheme: `${name} 的 PS 主线可围绕「计算机课程基础 + AI / Web 项目实践 + 面向${major}的职业目标」展开。`,
      psOutline: ['学术背景与目标专业动机', '核心课程和技术能力', '项目 / 实习经历与个人贡献', `为什么选择${country}及目标项目`, '未来职业规划'],
      cvHighlights: ['React / NestJS / TypeScript 全栈项目', 'RAG / Agent / LLM 应用工程', '数据库、向量检索和评测指标', '实习、课程项目或 GitHub 作品集'],
      recommendationAngles: ['学习能力和课程表现', '工程实践与问题拆解能力', '团队协作和沟通能力', '持续迭代和自驱学习能力'],
    },
    drafts: {
      personalStatement: `我希望申请${country}${major}相关硕士项目。本科阶段，我逐步建立了编程、数据结构、数据库和软件工程基础，并通过全栈开发、AI 应用和数据项目把课程知识落到实际场景中。尤其是在 EduAgent 这类项目中，我把 RAG 检索、Agent 工具编排、后端 API、前端工作台和可观测性结合起来，训练了从需求分析到工程交付的能力。未来我希望继续深入软件工程、人工智能应用和数据系统方向，并把研究生阶段的学习转化为可落地的产品与技术能力。`,
      cvSummary: `${name} 具备计算机相关学习背景和项目实践，重点突出全栈开发、RAG / Agent、数据库、部署和评测能力。`,
      recommendationSeed: '推荐信可强调申请人在课程学习、项目执行、技术自学、沟通协作和持续改进方面的表现。',
    },
    pipeline: [
      { stage: '背景确认', owner: '咨询顾问', status: '进行中', tasks: ['确认目标国家、专业和预算', '收集成绩单、语言成绩和项目经历'] },
      { stage: '选校定位', owner: '申请顾问', status: '待开始', tasks: ['拆分冲刺、匹配、保底', '逐校核对官网 entry requirements'] },
      { stage: '材料准备', owner: '学生 + 顾问', status: '待开始', tasks: ['准备成绩单、在读证明、CV、PS、推荐信', '整理项目证明和课程描述'] },
      { stage: '网申递交', owner: '申请顾问', status: '待开始', tasks: ['上传材料并核对命名', '跟踪补件、面试或语言条件'] },
    ],
    materialChecklist: ['成绩单', '在读证明 / 毕业证学位证', 'PS', 'CV', '推荐信', '护照', '语言成绩', '课程描述 / 项目证明'],
    riskFlags: ['热门计算机方向竞争高，需要尽早递交。', '需要逐校确认先修课程和语言小分要求。'],
    nextBestActions: ['确定 8-10 所候选学校', '完成 CV 和 PS 初稿', '整理项目经历为 STAR / 项目指标形式', '联系推荐人并提供素材包'],
    exportMarkdown: `# ${name} 申请案卷\n\n## 方向\n${country} ${major}\n\n## PS 主题\n计算机课程基础 + AI / Web 项目实践 + 职业目标\n\n## 材料\n- 成绩单\n- PS\n- CV\n- 推荐信\n- 语言成绩\n`,
    llmFallbackReason: '这次没有等到海外后端完整返回，先展示备用内容。',
    deployment: deploymentInfo('demo_fallback', reason),
  };
}

function makeGrowthCampaignFallback(body, reason) {
  const name = body?.name || '学生';
  const major = body?.major || '计算机硕士';
  const country = body?.country || '英国';
  return {
    brief: `${name} 目标${country}${major}，内容切入点可围绕背景定位、均分/GPA、项目经历、三档选校和申请材料清单。`,
    xiaohongshu: {
      title: `双非 / 海外本科背景，还能申请${country}${major}吗？`,
      hook: '很多同学一看到院校背景或 GPA 不够完美就觉得没机会，但硕士申请不是只看一个标签。',
      body: [
        '核心要看：成绩、课程匹配、项目经历、语言成绩、申请时间和文书表达。',
        '计算机方向尤其建议把项目写清楚：问题背景、技术方案、个人贡献和结果指标。',
        '选校不要只看排名，建议拆成冲刺、匹配、保底三档，先保证 offer 风险可控。',
      ],
      cta: '想看你的背景适合哪一档，可以先整理成绩单、项目经历和目标国家。',
      hashtags: ['英国留学', '计算机硕士', 'AI申请', '双非申请', '留学选校'],
    },
    videoScript: {
      opening: `双非或普通背景申请${country}${major}，到底该怎么选校？`,
      shots: ['先看均分和课程匹配', '再看项目经历能否补强', '最后按冲刺、匹配、保底拆分学校'],
      ending: '别只看排名，先做风险分层和材料规划。',
    },
    wechatFollowup: [
      '你好，我建议先按成绩、课程、项目和预算做一次初筛。',
      '计算机方向竞争比较高，建议同时准备冲刺、匹配和保底学校。',
      '你可以先发成绩单、项目经历和目标国家，我帮你拆一版申请策略。',
    ],
    contentCalendar: [
      { day: '周一', platform: '小红书', format: '图文', topic: '双非 / 普通背景如何申请英国计算机硕士', content: '用案例解释三档选校。' },
      { day: '周三', platform: '短视频', format: '口播', topic: '均分85怎么选校', content: '讲冲刺、匹配、保底的逻辑。' },
      { day: '周五', platform: '私域', format: 'Checklist', topic: '计算机硕士申请材料清单', content: '引导用户提交成绩单和项目经历。' },
    ],
    llmFallbackReason: '这次没有等到海外后端完整返回，先展示备用内容。',
    deployment: deploymentInfo('demo_fallback', reason),
  };
}

function makeCopywritingFallback(body, reason) {
  const country = body?.country || body?.targetCountry || '英国';
  const major = body?.major || body?.targetMajor || '计算机科学';
  return {
    wechat: `你好，我看你的目标是${country}${major}方向。建议我们先看三件事：成绩和课程匹配、项目/实习经历、目标学校梯队。这样能比较快判断冲刺、匹配和保底怎么分。`,
    shortVideoScript: ['开场：均分不完美还能申请英国计算机硕士吗？', '第一步看课程匹配和成绩区间。', '第二步看项目经历能否补强。', '第三步拆成冲刺、匹配、保底。', '结尾：先做定位，再准备 PS / CV。'],
    objectionHandling: [
      { objection: '担心背景不够强', response: '背景是一部分，但项目、课程匹配、文书和申请节奏也会影响结果。' },
      { objection: '语言还没考出来', response: '很多项目可以先申请后补语言，但需要注意最终换无条件 offer 的截止时间。' },
      { objection: '预算有限', response: '可以优先筛选非伦敦城市和奖学金机会，同时保留性价比较高的项目。' },
    ],
    callOutline: ['确认目标国家和专业', '确认成绩、课程和语言', '询问项目 / 实习经历', '解释三档选校', '约定材料清单和下一步'],
    followUpTasks: ['索要成绩单', '索要 CV 或项目清单', '确认预算与城市偏好', '输出初版学校分层'],
    llmFallbackReason: '这次没有等到海外后端完整返回，先展示备用内容。',
    deployment: deploymentInfo('demo_fallback', reason),
  };
}

function makeAdvisorSuiteFallback(body, reason) {
  const fit = makeProfileFitFallback(body, reason);
  const schools = makeSchoolRecommendFallback(body, reason);
  const application = makeApplicationPlanFallback(body, reason);
  const sales = makeCopywritingFallback(body, reason);
  const materials = makeMaterialListFallback(body, reason);
  return {
    executiveSummary: '已生成备用综合申请方案：先完成适配评分，再拆分选校，最后输出文书、材料和跟进动作。',
    workflow: [
      { step: 1, name: '适配评分', tool: 'weighted-fit-v2', status: 'done', output: `${fit.overall}/100 · ${fit.band}` },
      { step: 2, name: '选校分层', tool: 'school-recommend', status: 'done', output: '冲刺 / 匹配 / 保底' },
      { step: 3, name: '申请案卷', tool: 'application-plan', status: 'done', output: 'PS / CV / 推荐信 / 材料' },
      { step: 4, name: '销售跟进', tool: 'copywriting', status: 'done', output: '微信话术 / 短视频 / 跟进任务' },
    ],
    outputs: { fit, schools, application, sales, materials },
    agentTrace: {
      mode: 'domestic-entry-backup',
      algorithm: 'weighted-fit-v2',
      tools: ['profile-fit', 'school-recommend', 'application-plan', 'copywriting', 'material-list'],
      fallbackReason: reason || 'render_unavailable',
    },
    llmFallbackReason: '这次没有等到海外后端完整返回，先展示备用内容。',
    deployment: deploymentInfo('demo_fallback', reason),
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
    return json([{ id: 'edgeone-demo-conversation', title: '国内入口备用会话', updatedAt: nowIso() }]);
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

  if (pathname === '/api/tools/profile-fit' && method === 'POST') return json(makeProfileFitFallback(body, reason));
  if (pathname === '/api/tools/school-recommend' && method === 'POST') return json(makeSchoolRecommendFallback(body, reason));
  if (pathname === '/api/tools/material-list' && method === 'POST') return json(makeMaterialListFallback(body, reason));
  if (pathname === '/api/tools/application-plan' && method === 'POST') return json(makeApplicationPlanFallback(body, reason));
  if (pathname === '/api/tools/growth-campaign' && method === 'POST') return json(makeGrowthCampaignFallback(body, reason));
  if (pathname === '/api/tools/copywriting' && method === 'POST') return json(makeCopywritingFallback(body, reason));
  if (pathname === '/api/tools/advisor-suite' && method === 'POST') return json(makeAdvisorSuiteFallback(body, reason));

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
    message: '当前先返回备用结果；海外后端可用时会返回真实结果。',
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

function shouldSkipLiveProxy(request, pathname, env) {
  // Only force Demo Fallback when explicitly configured.
  // Do NOT skip live proxy just because the browser has an old edgeone-demo-token.
  // Older deployments issued that token, and skipping here would lock the whole app
  // into offline fallback even when Render is healthy. proxyToRender strips that demo
  // token before forwarding, so the Render backend can use its public guest context.
  return String(env?.EDGEONE_FORCE_DEMO || '').toLowerCase() === 'true';
}

async function proxyToRender(request, env, rawBody) {
  const target = makeTargetUrl(request, env);
  if (!target) throw new Error('missing_RENDER_API_BASE_URL');

  const timeoutMs = Number(env?.EDGEONE_PROXY_TIMEOUT_MS || 15000);
  const started = Date.now();

  const incomingHeaders = new Headers(request.headers);
  const headers = new Headers();

  const contentType = incomingHeaders.get('content-type');
  const accept = incomingHeaders.get('accept');
  const authorization = incomingHeaders.get('authorization');

  if (contentType) headers.set('content-type', contentType);
  if (accept) headers.set('accept', accept);

  // Do not forward the old EdgeOne demo token to Render.
  // That token is only for local fallback and would break real backend auth.
  if (authorization && !/edgeone-demo-token/i.test(authorization)) {
    headers.set('authorization', authorization);
  }

  const fetchPromise = fetch(target.toString(), {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method.toUpperCase()) ? undefined : rawBody,
  });

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('edgeone_proxy_timeout')), timeoutMs);
  });

  const response = await Promise.race([fetchPromise, timeoutPromise]);
  const latencyMs = Date.now() - started;
  const contentTypeResp = response.headers.get('content-type') || '';

  if (contentTypeResp.includes('application/json')) {
    const data = await response.json().catch(() => null);

    if (response.ok && data && typeof data === 'object' && !Array.isArray(data)) {
      data.deployment = deploymentInfo('live_api', null, latencyMs, target.origin);
    }

    return json(data, response.status, {
      'x-eduagent-runtime-mode': 'live_api',
      'x-eduagent-proxy': 'edgeone-functions',
    });
  }

  const responseText = await response.text().catch(() => '');
  return new Response(responseText, {
    status: response.status,
    headers: {
      'content-type': contentTypeResp || 'text/plain; charset=UTF-8',
      'access-control-allow-origin': '*',
      'x-eduagent-runtime-mode': 'live_api',
      'x-eduagent-proxy': 'edgeone-functions',
    },
  });
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

    if (!shouldSkipLiveProxy(request, pathname, env)) {
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
