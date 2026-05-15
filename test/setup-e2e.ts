import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import * as dotenv from 'dotenv';

const testEnvPath = resolve(process.cwd(), '.env.test');

if (existsSync(testEnvPath)) {
  dotenv.config({ path: testEnvPath, override: true });
}

if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-value';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-value';
process.env.JWT_ACCESS_TTL ??= '900s';
process.env.JWT_REFRESH_TTL ??= '7d';
process.env.APP_ORIGIN ??= 'http://localhost:3000';
