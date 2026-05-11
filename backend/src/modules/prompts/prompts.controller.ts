import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';

@Controller('prompts')
export class PromptsController {
  @Get()
  list() {
    return [
      { id: 'prompt_1', name: '院校推荐 Prompt', enabled: true, version: 1 },
      { id: 'prompt_2', name: '销售话术 Prompt', enabled: true, version: 1 },
    ];
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return { id: 'prompt_new', ...body };
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return { id, ...body };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return { deleted: true, id };
  }
}
