import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ToolsModule } from '../tools/tools.module';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [ToolsModule, LlmModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
