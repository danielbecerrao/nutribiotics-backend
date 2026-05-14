import { Controller, Get, INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/common/bootstrap/configure-app';
import { Roles } from './../src/common/decorators/roles.decorator';
import { PrismaService } from './../src/prisma/prisma.service';

const seedUsers = [
  {
    email: 'admin@test.com',
    password: 'admin123',
    name: 'Admin Test',
    role: Role.admin,
  },
  {
    email: 'dr@test.com',
    password: 'dr123',
    name: 'Doctor Test',
    role: Role.doctor,
  },
  {
    email: 'patient@test.com',
    password: 'patient123',
    name: 'Patient Test',
    role: Role.patient,
  },
];

interface AuthResponseBody {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: Role;
    createdAt: string;
    password?: unknown;
    refreshTokenHash?: unknown;
  };
}

async function upsertSeedUsers(prismaService: PrismaService) {
  for (const user of seedUsers) {
    const password = await bcrypt.hash(user.password, 10);

    await prismaService.user.upsert({
      where: { email: user.email },
      update: {
        password,
        name: user.name,
        role: user.role,
        refreshTokenHash: null,
      },
      create: {
        email: user.email,
        password,
        name: user.name,
        role: user.role,
      },
    });
  }
}

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
    await upsertSeedUsers(app.get(PrismaService));
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

  it.each(seedUsers)(
    '/auth/login (POST) accepts seed $role credentials',
    async (user) => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: user.email,
          password: user.password,
        })
        .expect(201);
      const body = response.body as AuthResponseBody;

      expect(typeof body.accessToken).toBe('string');
      expect(typeof body.refreshToken).toBe('string');
      expect(typeof body.user.id).toBe('string');
      expect(typeof body.user.createdAt).toBe('string');
      expect(body.user).toMatchObject({
        email: user.email,
        name: user.name,
        role: user.role,
      });
      expect(body.user.password).toBeUndefined();
      expect(body.user.refreshTokenHash).toBeUndefined();
    },
  );

  it('/auth/login (POST) rejects invalid credentials', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'wrong-password',
      })
      .expect(401)
      .expect({
        message: 'Invalid credentials',
        code: 'UNAUTHORIZED',
        details: {},
      });
  });

  it('/auth/refresh (POST) rotates refresh token', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'admin123',
      })
      .expect(201);
    const loginBody = loginResponse.body as AuthResponseBody;

    const refreshResponse = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({
        refreshToken: loginBody.refreshToken,
      })
      .expect(201);
    const refreshBody = refreshResponse.body as AuthResponseBody;

    expect(typeof refreshBody.accessToken).toBe('string');
    expect(typeof refreshBody.refreshToken).toBe('string');
    expect(refreshBody.refreshToken).not.toBe(loginBody.refreshToken);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({
        refreshToken: loginBody.refreshToken,
      })
      .expect(401)
      .expect({
        message: 'Invalid refresh token',
        code: 'UNAUTHORIZED',
        details: {},
      });
  });

  it('/auth/profile (GET) returns current user', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'admin123',
      })
      .expect(201);
    const loginBody = loginResponse.body as AuthResponseBody;

    const profileResponse = await request(app.getHttpServer())
      .get('/auth/profile')
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(200);
    const profile = profileResponse.body as AuthResponseBody['user'];

    expect(typeof profile.createdAt).toBe('string');
    expect(profile).toMatchObject({
      id: loginBody.user.id,
      email: 'admin@test.com',
      name: 'Admin Test',
      role: Role.admin,
    });
    expect(profile.password).toBeUndefined();
    expect(profile.refreshTokenHash).toBeUndefined();
  });

  afterEach(async () => {
    await app.close();
  });
});
