import { Body, Controller, Get, Param, Post } from '@nestjs/common';

@Controller()
export class ChatController {
  @Get('conversations')
  conversations() {
    return [
      { id: 'conv_1', title: '英国 CS 硕士申请咨询', updatedAt: new Date().toISOString() },
    ];
  }

  @Post('conversations')
  createConversation() {
    return { id: 'conv_new', title: '新的留学咨询会话', createdAt: new Date().toISOString() };
  }

  @Get('conversations/:id/messages')
  messages(@Param('id') id: string) {
    return {
      conversationId: id,
      messages: [
        { role: 'assistant', content: '当前为阶段 1 Mock 消息。' },
      ],
    };
  }

  @Post('chat')
  chat(@Body() body: { question: string }) {
    return {
      answer: `阶段 1 Mock 回答：已收到问题「${body.question}」。阶段 4 会接入 RAG，阶段 5 会接入 SSE 流式输出。`,
      sources: [],
      toolCalls: [],
    };
  }
}
