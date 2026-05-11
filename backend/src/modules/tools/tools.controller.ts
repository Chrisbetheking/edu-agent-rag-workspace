import { Body, Controller, Get, Post } from '@nestjs/common';
import { ToolsService } from './tools.service';

@Controller('tools')
export class ToolsController {
  constructor(private readonly tools: ToolsService) {}

  @Post('cgpa-convert')
  convert(@Body() body: any) {
    return this.tools.convertCgpa(body);
  }

  @Post('school-recommend')
  recommend(@Body() body: any) {
    return this.tools.recommendSchools(body);
  }

  @Post('copywriting')
  copywriting(@Body() body: any) {
    return this.tools.generateCopywriting(body);
  }

  @Post('material-list')
  materialList(@Body() body: any) {
    return this.tools.materialList(body);
  }

  @Get('logs')
  logs() {
    return this.tools.logs();
  }
}
