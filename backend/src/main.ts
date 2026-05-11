import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const corsOrigin = config.get<string>('CORS_ORIGIN') || 'http://localhost:5173';

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  const port = Number(config.get<string>('PORT')) || 3001;
  await app.listen(port);
  console.log(`EduAgent backend running on http://localhost:${port}/api`);
}

bootstrap();
