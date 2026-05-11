import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuthModule } from './modules/auth/auth.module';
import { ToolsModule } from './modules/tools/tools.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { ChatModule } from './modules/chat/chat.module';
import { PromptsModule } from './modules/prompts/prompts.module';
import { EvalModule } from './modules/eval/eval.module';
import { MemoryStore } from './shared/memory-store';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    ToolsModule,
    DocumentsModule,
    ChatModule,
    PromptsModule,
    EvalModule,
  ],
  controllers: [AppController],
  providers: [MemoryStore],
  exports: [MemoryStore],
})
export class AppModule {}
