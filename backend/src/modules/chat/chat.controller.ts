import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('conversations')
  conversations() {
    return this.chat.conversations();
  }

  @Post('conversations')
  create(@Body() body: { title: string }) {
    return this.chat.createConversation(body.title);
  }

  @Get('conversations/:id/messages')
  messages(@Param('id') id: string) {
    return this.chat.messages(id);
  }

  @Post()
  ask(@Body() body: any) {
    return this.chat.ask(body);
  }

  @Get('stream')
  stream(@Query('question') question: string, @Res() res: Response) {
    return this.chat.stream(question || '请介绍英国硕士申请材料', res);
  }
}
