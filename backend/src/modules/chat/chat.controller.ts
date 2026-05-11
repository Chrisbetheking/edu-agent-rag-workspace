import { Body, Controller, Get, Param, Post } from '@nestjs/common';

const conversations = [
  { id: 'demo-conv-1', title: 'APU CS 学生英国硕士申请方案', updatedAt: new Date().toISOString() },
];

@Controller('chat')
export class ChatController {
  @Get('conversations')
  conversations() {
    return conversations;
  }

  @Get('conversations/:id/messages')
  messages(@Param('id') id: string) {
    return [
      { id: 'm1', role: 'user', content: 'APU CS 本科 CGPA 3.2，想申请英国硕士，有哪些选择？', conversationId: id },
      {
        id: 'm2',
        role: 'assistant',
        content:
          '可以先用 CGPA 换算工具评估成绩区间，再结合预算、语言成绩和专业方向生成冲刺/匹配/保底院校。阶段 4 会接入真实 RAG 来源引用。',
        conversationId: id,
      },
    ];
  }

  @Post()
  chat(@Body() body: { message: string; conversationId?: string }) {
    const text = body.message || '';
    const shouldRecommend = /学校|院校|推荐|申请|硕士|英国|澳洲|马来西亚/i.test(text);
    const shouldCgpa = /cgpa|gpa|成绩|绩点/i.test(text);
    const toolHints = [
      shouldCgpa ? '建议调用 CGPA 换算工具' : null,
      shouldRecommend ? '建议调用院校推荐工具' : null,
    ].filter(Boolean);

    return {
      id: `assistant_${Date.now()}`,
      role: 'assistant',
      content:
        `我已收到你的问题：“${text}”。\n\n` +
        '当前阶段为 Phase 2 规则工具版本，可先使用工具中心完成 CGPA 换算、院校推荐和销售话术生成。Phase 4 会接入真实文档知识库与 RAG 来源引用。',
      toolHints,
      sources: [
        { title: 'Demo 留学知识库样例', snippet: '阶段 4 将替换为真实文档切片和相似度分数。' },
      ],
    };
  }
}
