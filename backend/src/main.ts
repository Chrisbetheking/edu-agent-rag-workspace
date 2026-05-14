import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

function allowedOrigins() {
  const configured = process.env.FRONTEND_ORIGIN || process.env.CORS_ORIGINS || '';
  const defaults = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://edu-agent-rag-workspace.vercel.app',
    'https://edu-agent-rag-workspace.edgeone.cool',
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

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors) =>
        new BadRequestException({
          message: '请求参数校验失败',
          errors: errors.map((error) => ({
            field: error.property,
            constraints: error.constraints || {},
          })),
        }),
    }),
  );

  app.enableCors({
    origin: allowedOrigins(),
    credentials: true,
  });

  const port = Number(process.env.PORT || 3000);

  await app.listen(port, '0.0.0.0');

  console.log(`EduAgent backend running on port ${port}`);
}

bootstrap();
