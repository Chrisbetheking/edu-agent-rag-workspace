import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { PromptsService } from './prompts.service';
import { CreatePromptDto, UpdatePromptDto } from './dto/prompt.dto';

@Controller('prompts')
export class PromptsController {
  constructor(private readonly prompts: PromptsService) {}

  @Get()
  list() {
    return this.prompts.list();
  }

  @Post()
  create(@Body() body: CreatePromptDto) {
    return this.prompts.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdatePromptDto) {
    return this.prompts.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.prompts.remove(id);
  }
}
