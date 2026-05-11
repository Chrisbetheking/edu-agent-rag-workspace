import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'edu-agent-backend',
      stage: 'phase-1-skeleton',
      timestamp: new Date().toISOString(),
    };
  }
}
