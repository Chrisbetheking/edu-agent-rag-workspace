import { Body, Controller, Get, Post } from '@nestjs/common';

@Controller('tools')
export class ToolsController {
  @Get()
  list() {
    return [
      { key: 'cgpa_convert', name: 'CGPA 换算工具', enabled: true },
      { key: 'school_recommend', name: '院校推荐工具', enabled: true },
      { key: 'copywriting', name: '销售话术生成工具', enabled: true },
    ];
  }

  @Post('cgpa-convert')
  cgpaConvert(@Body() body: { score: number; scale: string }) {
    return {
      input: body,
      result: '阶段 2 将迁移旧项目 GPA 换算规则。',
    };
  }

  @Post('school-recommend')
  schoolRecommend(@Body() body: Record<string, unknown>) {
    return { input: body, result: '阶段 2 将迁移旧项目院校推荐规则。' };
  }

  @Post('copywriting')
  copywriting(@Body() body: Record<string, unknown>) {
    return { input: body, result: '阶段 2 将迁移旧项目申请文案生成逻辑。' };
  }
}
