import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { configureApp } from './common/bootstrap/configure-app';
import { configureSwagger } from './common/bootstrap/configure-swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  configureApp(app, configService);
  configureSwagger(app);

  await app.listen(configService.getOrThrow<number>('PORT'));
}
void bootstrap();
