import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { Conversation, DocumentChunk, DocumentRecord, EvalQuestion, EvalResult, Message, PromptTemplate, ToolCallLog, User } from './types';
import { makeChunk, splitIntoChunks } from './text-utils';

@Injectable()
export class MemoryStore {
  users: User[] = [
    { id: 'u_chris', username: 'CHRISWANG', displayName: 'Chris Wang', role: 'admin' },
  ];

  documents: DocumentRecord[] = [];
  chunks: DocumentChunk[] = [];
  conversations: Conversation[] = [];
  messages: Message[] = [];
  toolLogs: ToolCallLog[] = [];
  prompts: PromptTemplate[] = [];
  evalQuestions: EvalQuestion[] = [];
  evalResults: EvalResult[] = [];
  callLogs: any[] = [];

  constructor() {
    this.seed();
  }

  private seed() {
    if (this.documents.length) return;
    this.addDocumentFromText('英国硕士申请 FAQ', 'seed-uk-faq.md', `# 英国硕士申请 FAQ

## 申请材料
英国硕士申请通常需要本科成绩单、在读证明或毕业证/学位证、个人陈述、推荐信、语言成绩和 CV/Resume。

## 计算机相关专业关注点
计算机、数据科学、人工智能、软件工程和网络安全方向通常重视本科均分、核心课程、项目经历、实习经历和语言成绩。

## 语言要求
雅思 6.5 是常见要求，部分项目接受 6.0 或配语言班，最终以学校官网为准。

## GPA 不高时的补强
GPA 较低时，可以通过项目经历、实习经历、GitHub/作品集、课程描述、推荐信和合理选校策略提升竞争力。`);
    this.addDocumentFromText('澳洲硕士申请指南', 'seed-au-guide.md', `# 澳洲硕士申请指南

## 基础判断
澳洲硕士申请通常关注本科背景、GPA、语言成绩和申请材料完整度。

## 专业匹配
计算机、数据科学、人工智能等方向通常需要说明编程基础、数学基础、数据库/算法课程和项目经历。

## 预算判断
学费和生活费差异较大，需要结合城市、学校、专业和奖学金机会综合评估。`);
    this.addDocumentFromText('马来西亚本科背景申请建议', 'seed-my-guide.md', `# 马来西亚本科背景申请建议

## 适用对象
适合 APU、Taylor's、Monash Malaysia、Sunway 等马来西亚本科背景学生申请英国、澳洲、新加坡或香港硕士。

## 背景表达重点
APU 计算机科学背景可以重点突出软件开发、AI 项目、数据分析项目、移动端项目、Web 全栈项目和实习经历。

## 成绩判断
CGPA 3.0 以上通常具备一定申请空间；CGPA 3.2/4.0 可重点考虑匹配院校，同时用项目、GitHub、实习和推荐信强化申请材料。

## 材料补强
建议补充课程描述、项目说明、GitHub 链接、实习证明、推荐信素材和一版面向目标专业的 CV。`);

    this.addDocumentFromText('26_英国计算机专业方向与项目匹配表', 'seed-major-uk-cs-program-fit.md', `# 英国计算机专业方向与项目匹配表

## 适用对象
适合想申请英国计算机、数据科学、人工智能、软件工程、网络安全、人机交互等授课型硕士的学生。

## Computer Science / Advanced Computer Science
推荐专业：Computer Science MSc、Advanced Computer Science MSc。
适合背景：计算机本科、软件工程本科、信息系统本科，核心课程包含算法、数据结构、数据库、操作系统、计算机网络、软件工程。
项目示例：University of Manchester MSc Advanced Computer Science；University of Bristol MSc Computer Science；University of Glasgow MSc Computing Science。
判断依据：课程覆盖面广，适合不想过早窄化方向、希望保留软件开发和技术岗选择的学生。

## Data Science / Data Analytics
推荐专业：Data Science MSc、Data Analytics MSc、Business Analytics MSc。
适合背景：有 Python、统计学、数据库、机器学习、数据分析、可视化或商业分析项目经历。
项目示例：University of Sheffield MSc Data Science；Queen Mary University of London MSc Big Data Science；Cardiff University MSc Data Science and Analytics。
判断依据：适合有 AI/数据项目、科研项目或数据实习的学生；如果数学和统计课较少，需要用项目和课程描述补强。

## Artificial Intelligence / Machine Learning
推荐专业：Artificial Intelligence MSc、Machine Learning MSc、AI and Data Science MSc。
适合背景：本科有算法、线性代数、概率统计、机器学习、深度学习、NLP/CV 或 AI 应用项目。
项目示例：University of Nottingham MSc Artificial Intelligence；University of Southampton MSc Artificial Intelligence；University of Leeds MSc Advanced Computer Science (Artificial Intelligence)。
判断依据：AI 方向竞争更强，建议提供可展示项目、论文/竞赛/开源经历或完整 GitHub。

## Software Engineering
推荐专业：Software Engineering MSc、Software Systems Engineering MSc、Advanced Software Engineering MSc。
适合背景：有 Web 全栈、后端服务、数据库、DevOps、测试、团队项目或实习经验。
项目示例：University of York MSc Software Engineering；University of Leicester MSc Advanced Software Engineering；University of Liverpool MSc Advanced Computer Science。
判断依据：适合工程经历较强、希望突出就业导向和项目落地能力的学生。

## Cyber Security
推荐专业：Cyber Security MSc、Information Security MSc、Computer Security MSc。
适合背景：有计算机网络、操作系统、安全基础、密码学、Linux、CTF 或安全项目。
项目示例：University of Birmingham MSc Cyber Security；University of York MSc Cyber Security；Royal Holloway MSc Information Security。
判断依据：需要逐校核对先修课，安全方向对网络、系统和数学基础要求更明确。`);

    this.addDocumentFromText('27_英国数据科学硕士院校与专业细分', 'seed-major-uk-data-science-schools.md', `# 英国数据科学硕士院校与专业细分

## 冲刺档
University College London / UCL：Data Science and Machine Learning MSc。适合数学、统计、机器学习和编程基础较强的申请者。
University of Edinburgh：Data Science MSc 或 Artificial Intelligence MSc。适合 AI、机器学习、数据挖掘和科研/竞赛经历较强的申请者。
King's College London：Artificial Intelligence MSc 或 Data Science MSc。适合希望兼顾伦敦资源、AI 应用和数据方向的学生。

## 匹配档
University of Manchester：Data Science MSc / Advanced Computer Science MSc。适合计算机本科且有数据、AI 或软件项目的学生。
University of Glasgow：Data Science MSc / Computing Science MSc。适合 CGPA 中上、项目经历较完整的学生。
University of Sheffield：Data Science MSc。适合希望走数据分析、机器学习和应用数据方向的学生。
Queen Mary University of London：Big Data Science MSc。适合有数据库、分布式系统或数据处理项目的学生。

## 保底档
Cardiff University：Data Science and Analytics MSc。适合希望保留数据方向且控制录取风险的学生。
University of Liverpool：Data Science and Artificial Intelligence MSc。适合有计算机/软件基础、希望补强 AI 与数据方向的学生。
University of Sussex：Data Science MSc。适合需要稳妥选择、同时希望保留数据科学方向的学生。

## 使用建议
同一所学校下要看具体 programme，而不是只看大学名字。申请时建议记录中文校名、英文校名、具体专业英文全称、课程模块、先修课要求、语言要求、截止时间和申请费。`);

    this.addDocumentFromText('28_院校专业排序与成功率初筛说明', 'seed-major-ranking-success-rate.md', `# 院校专业排序与成功率初筛说明

## 排序逻辑
院校推荐不应该只给学校名字，建议按“学校 + 专业/项目 + 初筛成功率区间 + 风险点 + 下一步动作”展示。

## 初筛成功率参考
冲刺档通常用于保留上限，初筛成功率可参考 25%-50%。匹配档通常作为主申请区间，初筛成功率可参考 55%-75%。保底档用于控制风险，初筛成功率可参考 75%-90%。

## 专业维度
同一学校不同专业差异很大。例如 Computer Science、Advanced Computer Science、Data Science、Artificial Intelligence、Software Engineering、Cyber Security 的先修课要求和竞争强度都不同。

## 展示规范
每条推荐建议包含：中文校名、英文校名、中文专业名、英文专业全称、推荐理由、适配点、风险点、初筛成功率、下一步动作。

## 风险边界
成功率只是咨询初筛估计，不等于学校官方录取率，也不能承诺录取。最终判断必须以学校官网、当年招生政策和学生完整材料为准。`);

    this.prompts = [
      { id: uuid(), name: '院校推荐 Prompt', scene: 'school_recommendation', enabled: true, variables: ['国家', '专业', 'GPA', '预算', '语言成绩'], content: '请基于学生背景给出冲刺、匹配、保底三档院校，并说明推荐理由和风险点。', updatedAt: new Date().toISOString() },
      { id: uuid(), name: '销售话术 Prompt', scene: 'sales_copywriting', enabled: true, variables: ['学生背景', '目标国家', '顾虑点'], content: '请生成适合微信沟通的留学咨询话术，语气专业、简洁、有转化引导。', updatedAt: new Date().toISOString() },
      { id: uuid(), name: 'FAQ 问答 Prompt', scene: 'rag_qa', enabled: true, variables: ['问题', '检索上下文'], content: '请严格基于检索上下文回答问题，不确定时说明需以学校官网为准。', updatedAt: new Date().toISOString() },
    ];

    this.evalQuestions = [
      { id: uuid(), question: '英国计算机硕士一般需要哪些申请材料？', expectedSource: '英国硕士申请 FAQ', createdAt: new Date().toISOString() },
      { id: uuid(), question: 'APU 计算机本科申请海外硕士应该突出什么？', expectedSource: '马来西亚本科背景申请建议', createdAt: new Date().toISOString() },
    ];
  }

  addDocumentFromText(title: string, fileName: string, text: string, source = 'local') {
    const now = new Date().toISOString();
    const ownerId = source === 'guest' ? 'guest_public' : 'u_chris';
    const visibility = source === 'guest' ? 'guest' : 'public';
    const doc: DocumentRecord = { id: uuid(), title, fileName, source, status: 'parsed', createdAt: now, updatedAt: now, chunkCount: 0, ownerId, visibility };
    const chunks = splitIntoChunks(text).map((chunk, index) => ({ ...makeChunk(doc.id, doc.title, chunk, index), ownerId }));
    doc.chunkCount = chunks.length;
    this.documents.unshift(doc);
    this.chunks.push(...chunks);
    return doc;
  }

  createConversation(title: string, userId = 'u_chris') {
    const now = new Date().toISOString();
    const c: Conversation = { id: uuid(), title, createdAt: now, updatedAt: now, userId };
    this.conversations.unshift(c);
    return c;
  }

  addMessage(conversationId: string, role: 'user' | 'assistant', content: string, sources?: any[], toolCalls?: any[]) {
    const msg: Message = { id: uuid(), conversationId, role, content, sources, toolCalls, createdAt: new Date().toISOString() };
    this.messages.push(msg);
    const conv = this.conversations.find((item) => item.id === conversationId);
    if (conv) conv.updatedAt = new Date().toISOString();
    return msg;
  }

  addToolLog(log: Omit<ToolCallLog, 'id' | 'createdAt'>) {
    const item: ToolCallLog = { id: uuid(), createdAt: new Date().toISOString(), ...log };
    this.toolLogs.unshift(item);
    return item;
  }

  upsertPrompt(payload: Partial<PromptTemplate>) {
    if (payload.id) {
      const old = this.prompts.find((p) => p.id === payload.id);
      if (old) Object.assign(old, payload, { updatedAt: new Date().toISOString() });
      return old;
    }
    const prompt: PromptTemplate = {
      id: uuid(),
      name: payload.name || '未命名 Prompt',
      scene: payload.scene || 'custom',
      content: payload.content || '',
      variables: payload.variables || [],
      enabled: payload.enabled ?? true,
      updatedAt: new Date().toISOString(),
    };
    this.prompts.unshift(prompt);
    return prompt;
  }

  addEvalQuestion(question: string, expectedSource: string, expectedAnswer?: string) {
    const item: EvalQuestion = { id: uuid(), question, expectedSource, expectedAnswer, createdAt: new Date().toISOString() };
    this.evalQuestions.unshift(item);
    return item;
  }

  addEvalResult(result: Omit<EvalResult, 'id' | 'createdAt'>) {
    const item: EvalResult = { id: uuid(), createdAt: new Date().toISOString(), ...result };
    this.evalResults.unshift(item);
    return item;
  }

  addCallLog(log: any) {
    const item = { id: uuid(), createdAt: new Date().toISOString(), ...log };
    this.callLogs.unshift(item);
    this.callLogs = this.callLogs.slice(0, 200);
    return item;
  }
}
