import { Role } from '@prisma/client';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: Role;
  name?: string;
  iat?: number;
  exp?: number;
}
