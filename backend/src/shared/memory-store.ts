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

  constructor() {
    this.seed();
  }

  private seed() {
    if (this.documents.length) return;
    this.addDocumentFromText('英国硕士申请 FAQ', 'seed-uk-faq.md', `英国硕士申请通常需要本科成绩单、在读证明或毕业证、个人陈述、推荐信、语言成绩和简历。计算机相关专业通常重视本科均分、核心课程、项目经历和语言成绩。雅思 6.5 是常见要求，部分学校接受 6.0 或配语言班。GPA 较低时可以通过项目经历、实习经历、推荐信和合理选校策略提升竞争力。`);
    this.addDocumentFromText('澳洲硕士申请指南', 'seed-au-guide.md', `澳洲硕士申请通常关注本科背景、GPA、语言成绩和申请材料完整度。预算方面，学费和生活费差异较大，需要结合城市、学校和专业综合评估。计算机、数据科学、人工智能等方向通常需要说明编程基础、数学基础和项目经历。`);
    this.addDocumentFromText('马来西亚本科背景申请建议', 'seed-my-guide.md', `马来西亚本科学生申请海外硕士时，需要准备完整成绩单、课程描述、语言成绩、个人陈述和简历。APU 计算机科学背景可以重点突出软件开发、AI 项目、移动端项目和实习经历。CGPA 3.0 以上通常具备一定申请空间，具体要求以目标学校官网为准。`);

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
}
