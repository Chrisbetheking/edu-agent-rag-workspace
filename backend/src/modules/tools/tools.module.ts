import { Module } from '@nestjs/common';
import { ToolsController } from './tools.controller';
import { ToolsService } from './tools.service';
import { LlmModule } from '../llm/llm.module';

@Module({ imports: [LlmModule], controllers: [ToolsController], providers: [ToolsService], exports: [ToolsService] })
export class ToolsModule {}
