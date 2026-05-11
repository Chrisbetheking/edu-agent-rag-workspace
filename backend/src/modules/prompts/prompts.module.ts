import { Module } from '@nestjs/common';
import { PromptsController } from './prompts.controller';

@Module({ controllers: [PromptsController] })
export class PromptsModule {}
