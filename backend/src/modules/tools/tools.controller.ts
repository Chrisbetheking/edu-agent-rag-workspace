import { Body, Controller, Get, Post } from '@nestjs/common';
import { ToolsService } from './tools.service';

@Controller('tools')
export class ToolsController {
  constructor(private readonly toolsService: ToolsService) {}

  @Get()
  list() {
    return this.toolsService.listTools();
  }

  @Get('logs')
  logs() {
    return this.toolsService.getLogs();
  }

  @Post('cgpa-convert')
  cgpaConvert(@Body() body: { score?: number; scale?: '4.0' | '5.0' | '100'; targetCountry?: string }) {
    return this.toolsService.convertCgpa(body);
  }

  @Post('school-recommend')
  schoolRecommend(
    @Body()
    body: {
      country?: string;
      major?: string;
      gpa?: number;
      scale?: '4.0' | '5.0' | '100';
      englishScore?: string;
      budget?: string;
      background?: string;
    },
  ) {
    return this.toolsService.recommendSchools(body);
  }

  @Post('copywriting')
  copywriting(
    @Body()
    body: {
      studentName?: string;
      targetCountry?: string;
      major?: string;
      gpa?: number;
      concern?: string;
      channel?: 'wechat' | 'phone' | 'short_video';
      background?: string;
    },
  ) {
    return this.toolsService.generateCopywriting(body);
  }
}
