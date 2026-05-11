import { Module } from '@nestjs/common';
import { EvalController } from './eval.controller';
import { EvalService } from './eval.service';
import { ChatModule } from '../chat/chat.module';

@Module({ imports: [ChatModule], controllers: [EvalController], providers: [EvalService] })
export class EvalModule {}
