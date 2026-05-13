import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    const llmConfigured = Boolean(process.env.LLM_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY);
    const embeddingConfigured = Boolean(process.env.EMBEDDING_API_KEY && process.env.EMBEDDING_BASE_URL && process.env.EMBEDDING_MODEL);
    return {
      status: 'ok',
      name: 'EduAgent Backend',
      version: '1.2.0',
      demoMode: !llmConfigured || String(process.env.FORCE_MOCK_CHAT || '').toLowerCase() === 'true',
      aiMode: llmConfigured ? 'real-llm' : 'safe-fallback',
      model: process.env.LLM_MODEL || 'deepseek-chat',
      embeddingConfigured,
      embeddingModel: process.env.EMBEDDING_MODEL || '',
      embeddingDimension: Number(process.env.EMBEDDING_DIMENSION || 1536),
      time: new Date().toISOString(),
    };
  }
}
