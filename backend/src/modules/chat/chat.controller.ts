import { Body, Controller, Get, Headers, Param, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ChatService } from './chat.service';
import { AuthContextService } from '../../shared/auth-context.service';
import { AskChatDto } from './dto/ask-chat.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly chat: ChatService,
    private readonly authContext: AuthContextService,
  ) {}

  private user(authorization?: string) {
    return this.authContext.getUserFromAuthorization(authorization);
  }

  @Get('conversations')
  async conversations(@Headers('authorization') authorization?: string): Promise<any> {
    return this.chat.conversations(this.user(authorization));
  }

  @Post('conversations')
  async create(@Body() body: CreateConversationDto, @Headers('authorization') authorization?: string): Promise<any> {
    return this.chat.createConversation(body.title, this.user(authorization));
  }

  @Get('conversations/:id/messages')
  async messages(@Param('id') id: string, @Headers('authorization') authorization?: string): Promise<any> {
    return this.chat.messages(id, this.user(authorization));
  }

  @Post()
  async ask(@Body() body: AskChatDto, @Headers('authorization') authorization?: string): Promise<any> {
    return this.chat.ask(body, this.user(authorization));
  }

  @Get('stream')
  stream(@Query('question') question: string, @Res() res: Response, @Headers('authorization') authorization?: string) {
    return this.chat.stream(question || '请介绍英国硕士申请材料', res, this.user(authorization));
  }
}
