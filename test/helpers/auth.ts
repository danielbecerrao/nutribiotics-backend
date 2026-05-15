import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';

interface AuthResponseBody {
  accessToken: string;
  refreshToken: string;
  user: {
    createdAt: string;
    email: string;
    id: string;
    name: string;
    role: string;
  };
}

export async function loginTestUser(
  app: INestApplication,
  email: string,
  password: string,
) {
  const response = await request(app.getHttpServer() as App)
    .post('/auth/login')
    .send({ email, password })
    .expect(201);

  return response.body as AuthResponseBody;
}
