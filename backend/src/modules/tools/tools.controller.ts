import { Body, Controller, Get, Post, Query } from '@nestjs/common';
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

  @Get('overview')
  async overview(@Query('limit') limit?: string) {
    return this.tools.overview(Number(limit || 80));
  }

  @Get('logs')
  async logs(@Query('limit') limit?: string) {
    return this.tools.logs(Number(limit || 50));
  }
}
