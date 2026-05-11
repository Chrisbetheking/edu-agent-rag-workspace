import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

function allowedOrigins() {
  const configured = process.env.FRONTEND_ORIGIN || process.env.CORS_ORIGINS || '';
  const defaults = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://edu-agent-rag-workspace.vercel.app',
  ];

  return Array.from(
    new Set(
      configured
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .concat(defaults),
    ),
  );
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: allowedOrigins(),
    credentials: true,
  });

  const port = Number(process.env.PORT || 3000);

  await app.listen(port, '0.0.0.0');

  console.log(`EduAgent backend running on port ${port}`);
}

bootstrap();
