import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { MemoryStore } from '../../shared/memory-store';
import { keywordScore } from '../../shared/text-utils';
import { ToolsService } from '../tools/tools.service';

@Injectable()
export class ChatService {
  constructor(private readonly store: MemoryStore, private readonly tools: ToolsService) {}

  conversations() {
    return this.store.conversations;
  }

  createConversation(title: string) {
    return this.store.createConversation(title || '新的留学咨询会话');
  }

  messages(conversationId: string) {
    return this.store.messages.filter((m) => m.conversationId === conversationId);
  }

  retrieve(query: string, topK = 3) {
    return this.store.chunks
      .map((chunk) => ({ ...chunk, score: keywordScore(query, chunk.content) }))
      .filter((chunk) => chunk.score > 0)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, topK);
  }

  private detectTools(query: string) {
    const calls: any[] = [];
    const lower = query.toLowerCase();
    if (/cgpa|gpa|绩点|均分/.test(lower)) {
      const num = Number((query.match(/\d+(\.\d+)?/) || ['3.2'])[0]);
      calls.push({ name: 'CGPA 换算工具', result: this.tools.convertCgpa({ cgpa: num, scale: 4, targetCountry: '英国/澳洲' }) });
    }
    if (/推荐|学校|院校|university|申请/.test(lower)) {
      calls.push({ name: '院校推荐工具', result: this.tools.recommendSchools({ gpa: 3.2, country: '英国/澳洲', major: '计算机', budget: '30万人民币' }) });
    }
    if (/话术|销售|文案|短视频|沟通/.test(lower)) {
      calls.push({ name: '销售话术生成工具', result: this.tools.generateCopywriting({ name: '同学', country: '英国', concern: '选校和成功率' }) });
    }
    return calls;
  }

  ask(body: { conversationId?: string; question: string; topK?: number }) {
    const question = (body.question || '').slice(0, Number(process.env.MAX_INPUT_LENGTH || 2000));
    const conv = body.conversationId ? this.store.conversations.find((c) => c.id === body.conversationId) : this.store.createConversation(question.slice(0, 20) || '新的咨询');
    const conversationId = conv?.id || this.store.createConversation('新的咨询').id;
    this.store.addMessage(conversationId, 'user', question);

    const sources = this.retrieve(question, body.topK || 3);
    const toolCalls = this.detectTools(question);
    const sourceText = sources.length ? sources.map((s, i) => `${i + 1}. ${s.documentTitle}：${s.content.slice(0, 120)}...`).join('\n') : '暂无命中来源。';
    const toolText = toolCalls.length ? `\n\n系统同时识别到可调用工具：${toolCalls.map((t) => t.name).join('、')}。` : '';
    const answer = `根据当前知识库检索结果，建议先从学生背景、目标国家、GPA、预算、语言成绩和专业匹配度进行初筛。\n\n命中来源：\n${sourceText}${toolText}\n\n注意：本回答为 Demo 模式生成，真实申请请以学校官网和当年招生要求为准。`;
    this.store.addMessage(conversationId, 'assistant', answer, sources, toolCalls);
    return { conversationId, answer, sources, toolCalls };
  }

  async stream(question: string, res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    const result = this.ask({ question });
    const pieces = result.answer.split('');
    for (const ch of pieces) {
      res.write(`data: ${JSON.stringify({ delta: ch })}\n\n`);
      await new Promise((r) => setTimeout(r, 8));
    }
    res.write(`data: ${JSON.stringify({ done: true, sources: result.sources, toolCalls: result.toolCalls })}\n\n`);
    res.end();
  }
}
