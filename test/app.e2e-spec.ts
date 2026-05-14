import { Controller, Get, INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/common/bootstrap/configure-app';
import { Roles } from './../src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('protected')
class ProtectedTestController {
  @Get()
  getProtected() {
    return 'Protected';
  }

  @Roles(Role.doctor)
  @Get('doctor')
  getDoctorOnly() {
    return 'Doctor only';
  }
}

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ProtectedTestController],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app, app.get(ConfigService));
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/missing (GET)', () => {
    return request(app.getHttpServer()).get('/missing').expect(404).expect({
      message: 'Cannot GET /missing',
      code: 'NOT_FOUND',
      details: {},
    });
  });

  it('/protected (GET) rejects requests without token', () => {
    return request(app.getHttpServer()).get('/protected').expect(401).expect({
      message: 'Unauthorized',
      code: 'UNAUTHORIZED',
      details: {},
    });
  });

  afterEach(async () => {
    await app.close();
  });
});
