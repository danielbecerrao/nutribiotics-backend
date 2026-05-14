import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { HttpExceptionFilter } from '../filters/http-exception.filter';

export function configureApp(
  app: INestApplication,
  configService: ConfigService,
) {
  app.use(helmet());

  app.enableCors({
    origin: configService.getOrThrow<string>('APP_ORIGIN'),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
}
