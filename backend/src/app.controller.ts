import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  health() {
    return {
      status: 'ok',
      name: 'EduAgent Backend',
      version: '1.0.0',
      demoMode: process.env.DEMO_MODE !== 'false',
      time: new Date().toISOString(),
    };
  }
}
