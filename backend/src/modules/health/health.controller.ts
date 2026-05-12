import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    const llmConfigured = Boolean(process.env.LLM_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY);
    return {
      status: 'ok',
      name: 'EduAgent Backend',
      version: '1.1.0',
      demoMode: !llmConfigured || String(process.env.FORCE_MOCK_CHAT || '').toLowerCase() === 'true',
      aiMode: llmConfigured ? 'real-llm' : 'safe-fallback',
      model: process.env.LLM_MODEL || 'deepseek-chat',
      time: new Date().toISOString(),
    };
  }
}
