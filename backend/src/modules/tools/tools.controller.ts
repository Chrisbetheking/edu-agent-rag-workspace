import { Body, Controller, Get, Headers, Post, Query } from '@nestjs/common';
import { ToolsService } from './tools.service';
import { AuthContextService } from '../../shared/auth-context.service';

@Controller('tools')
export class ToolsController {
  constructor(
    private readonly tools: ToolsService,
    private readonly authContext: AuthContextService,
  ) {}

  private async withQuota<T>(authorization: string | undefined, fn: () => Promise<T> | T, consume = true): Promise<T & { quota?: any }> {
    const user = this.authContext.getUserFromAuthorization(authorization);
    const quota = consume ? this.authContext.consumeGuestQuota(user) : this.authContext.quotaFor(user);
    const result: any = await fn();

    if (result && typeof result === 'object' && !Array.isArray(result)) {
      return { ...result, quota };
    }

    return { result, quota } as any;
  }

  @Post('cgpa-convert')
  convert(@Body() body: any, @Headers('authorization') authorization?: string) {
    // 纯本地换算，不消耗访客 AI 额度，但仍返回当前额度，方便前端展示同步。
    return this.withQuota(authorization, () => this.tools.convertCgpa(body), false);
  }

  @Post('school-recommend')
  recommend(@Body() body: any, @Headers('authorization') authorization?: string) {
    return this.withQuota(authorization, () => this.tools.recommendSchools(body));
  }

  @Post('copywriting')
  copywriting(@Body() body: any, @Headers('authorization') authorization?: string) {
    return this.withQuota(authorization, () => this.tools.generateCopywriting(body));
  }

  @Post('growth-campaign')
  growthCampaign(@Body() body: any, @Headers('authorization') authorization?: string) {
    return this.withQuota(authorization, () => this.tools.growthCampaign(body));
  }

  @Post('material-list')
  materialList(@Body() body: any, @Headers('authorization') authorization?: string) {
    // 材料清单是规则工具，不消耗 AI 额度。
    return this.withQuota(authorization, () => this.tools.materialList(body), false);
  }

  @Post('application-plan')
  applicationPlan(@Body() body: any, @Headers('authorization') authorization?: string) {
    return this.withQuota(authorization, () => this.tools.applicationPlan(body));
  }

  @Post('advisor-suite')
  advisorSuite(@Body() body: any, @Headers('authorization') authorization?: string) {
    // 完整 Agent 流内部会串多个工具，但访客额度只扣 1 次，更适合作品集体验。
    return this.withQuota(authorization, () => this.tools.advisorSuite(body));
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
