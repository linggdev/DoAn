import { NestFactory } from '@nestjs/core';
import * as express from 'express';
import * as path from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true, credentials: true });

  const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads');
  app.use('/uploads', express.static(uploadDir));

  const port = Number(process.env.PORT || 3000);
  await app.listen(port);
  console.log(`ATS Backend running on http://localhost:${port}`);
}
bootstrap();

