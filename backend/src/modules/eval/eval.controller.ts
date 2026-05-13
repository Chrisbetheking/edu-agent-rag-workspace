import { Body, Controller, Get, Post } from '@nestjs/common';
import { EvalService } from './eval.service';
import { CreateEvalQuestionDto } from './dto/create-eval-question.dto';
import { RunEvalDto } from './dto/run-eval.dto';

@Controller('eval')
export class EvalController {
  constructor(private readonly evalService: EvalService) {}

  @Get('questions')
  questions() {
    return this.evalService.questions();
  }

  @Post('questions')
  createQuestion(@Body() body: CreateEvalQuestionDto) {
    return this.evalService.createQuestion(body);
  }

  @Post('run')
  run(@Body() body: RunEvalDto) {
    return this.evalService.run(body);
  }

  @Get('results')
  results() {
    return this.evalService.results();
  }
}
