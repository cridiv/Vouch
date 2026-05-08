import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  app.setGlobalPrefix('v1')
  app.enableCors({ origin: '*' })
  await app.listen(process.env.PORT ?? 5000);
  console.log(`Application is running on: http://localhost:${process.env.PORT ?? 5000}`);
}
bootstrap();
