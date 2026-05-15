import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/common/bootstrap/configure-app';
import { PrismaService } from '../../src/prisma/prisma.service';

export async function createE2eApp() {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleFixture.createNestApplication();

  configureApp(app, app.get(ConfigService));
  await app.init();

  return {
    app,
    prismaService: app.get(PrismaService),
  };
}

export async function closeE2eApp(app: INestApplication) {
  await app.close();
}
