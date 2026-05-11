import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { MemoryStore } from '../../shared/memory-store';
import { keywordScore } from '../../shared/text-utils';
import { ToolsService } from '../tools/tools.service';
import { LlmService } from '../llm/llm.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly store: MemoryStore,
    private readonly tools: ToolsService,
    private readonly llmService: LlmService,
  ) {}

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

  private isDemoMode() {
    return String(process.env.DEMO_MODE || 'true').toLowerCase() === 'true';
  }

  private detectTools(query: string) {
    const calls: any[] = [];
    const lower = query.toLowerCase();

    if (/cgpa|gpa|绩点|均分/.test(lower)) {
      const num = Number((query.match(/\d+(\.\d+)?/) || ['3.2'])[0]);

      calls.push({
        name: 'CGPA 换算工具',
        result: this.tools.convertCgpa({
          cgpa: num,
          scale: 4,
          targetCountry: '英国/澳洲',
        }),
      });
    }

    if (/推荐|学校|院校|university|申请/.test(lower)) {
      calls.push({
        name: '院校推荐工具',
        result: this.tools.recommendSchools({
          gpa: 3.2,
          country: '英国/澳洲',
          major: '计算机',
          budget: '30万人民币',
        }),
      });
    }

    if (/话术|销售|文案|短视频|沟通/.test(lower)) {
      calls.push({
        name: '销售话术生成工具',
        result: this.tools.generateCopywriting({
          name: '同学',
          country: '英国',
          concern: '选校和成功率',
        }),
      });
    }

    return calls;
  }

  private buildSourceText(sources: any[]) {
    return sources.length
      ? sources
          .map((s, i) => {
            const title = s.documentTitle || '未命名资料';
            const content = s.content || '';
            return `${i + 1}. ${title}：${content.slice(0, 300)}...`;
          })
          .join('\n')
      : '暂无命中来源。';
  }

  private buildToolText(toolCalls: any[]) {
    return toolCalls.length
      ? toolCalls
          .map((tool, index) => {
            return `${index + 1}. ${tool.name}：${JSON.stringify(tool.result, null, 2)}`;
          })
          .join('\n')
      : '暂无工具调用。';
  }

  private buildDemoAnswer(sourceText: string, toolCalls: any[]) {
    const toolText = toolCalls.length
      ? `\n\n系统同时识别到可调用工具：${toolCalls.map((t) => t.name).join('、')}。`
      : '';

    return `根据当前知识库检索结果，建议先从学生背景、目标国家、GPA、预算、语言成绩和专业匹配度进行初筛。

命中来源：
${sourceText}${toolText}

注意：本回答为 Demo 模式生成，真实申请请以学校官网和当年招生要求为准。`;
  }

  private async buildRealAnswer(question: string, sources: any[], toolCalls: any[]) {
    const sourceText = this.buildSourceText(sources);
    const toolText = this.buildToolText(toolCalls);

    return this.llmService.chat([
      {
        role: 'system',
        content: `你是 EduAgent，一个面向留学咨询场景的 AI Agent 助手。

你的任务：
1. 根据用户背景，给出专业、结构化、可执行的留学申请建议。
2. 如果用户提到 GPA、CGPA、均分、预算、国家、专业方向，要主动进行分析。
3. 回答要尽量具体，不要只说空话。
4. 需要体现 RAG 知识库来源和工具调用结果，但不要编造不存在的来源。
5. 如果知识库没有命中，也要基于通用留学申请逻辑给出合理建议。
6. 最后提醒用户：真实申请应以学校官网和当年招生要求为准。

回答格式建议：
- 学生背景判断
- 申请方向分析
- 保底 / 匹配 / 冲刺建议
- 时间规划
- 风险提醒
- 下一步行动建议`,
      },
      {
        role: 'user',
        content: `用户问题：
${question}

知识库检索结果：
${sourceText}

系统工具调用结果：
${toolText}

请基于以上信息生成完整回答。`,
      },
    ]);
  }

  async ask(body: { conversationId?: string; question: string; topK?: number }) {
    const question = (body.question || '').slice(
      0,
      Number(process.env.MAX_INPUT_LENGTH || 2000),
    );

    const conv = body.conversationId
      ? this.store.conversations.find((c) => c.id === body.conversationId)
      : this.store.createConversation(question.slice(0, 20) || '新的咨询');

    const conversationId = conv?.id || this.store.createConversation('新的咨询').id;

    this.store.addMessage(conversationId, 'user', question);

    const sources = this.retrieve(question, body.topK || 3);
    const toolCalls = this.detectTools(question);
    const sourceText = this.buildSourceText(sources);

    let answer = '';

    if (this.isDemoMode()) {
      answer = this.buildDemoAnswer(sourceText, toolCalls);
    } else {
      try {
        answer = await this.buildRealAnswer(question, sources, toolCalls);
      } catch (error: any) {
        answer = `真实大模型调用失败。

当前后端已经不是 Demo 模式，但调用 DeepSeek API 时发生错误。

错误信息：
${error?.message || String(error)}

请检查 Render 环境变量：
- LLM_API_KEY 是否存在
- LLM_BASE_URL 是否为 https://api.deepseek.com
- LLM_MODEL 是否为 deepseek-chat
- DEMO_MODE 是否为 false

注意：这里没有回退到 Demo 回答，方便你定位真实错误。`;
      }
    }

    this.store.addMessage(conversationId, 'assistant', answer, sources, toolCalls);

    return {
      conversationId,
      answer,
      sources,
      toolCalls,
    };
  }

  async stream(question: string, res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const result = await this.ask({ question });

    const pieces = result.answer.split('');

    for (const ch of pieces) {
      res.write(`data: ${JSON.stringify({ delta: ch })}\n\n`);
      await new Promise((r) => setTimeout(r, 8));
    }

    res.write(
      `data: ${JSON.stringify({
        done: true,
        sources: result.sources,
        toolCalls: result.toolCalls,
      })}\n\n`,
    );

    res.end();
  }
}
