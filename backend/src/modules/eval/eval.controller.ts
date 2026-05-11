import { Body, Controller, Get, Post } from '@nestjs/common';
import { EvalService } from './eval.service';

@Controller('eval')
export class EvalController {
  constructor(private readonly evalService: EvalService) {}

  @Get('questions')
  questions() {
    return this.evalService.questions();
  }

  @Post('questions')
  createQuestion(@Body() body: any) {
    return this.evalService.createQuestion(body);
  }

  @Post('run')
  run(@Body() body: any) {
    return this.evalService.run(body);
  }

  @Get('results')
  results() {
    return this.evalService.results();
  }
}
