import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      name: 'EduAgent Backend',
      version: '1.0.0',
      demoMode: String(process.env.DEMO_MODE || 'true').toLowerCase() === 'true',
      time: new Date().toISOString(),
    };
  }
}
