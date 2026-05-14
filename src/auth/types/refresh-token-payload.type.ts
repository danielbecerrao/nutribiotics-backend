export interface RefreshTokenPayload {
  sub: string;
  tokenType: 'refresh';
  jti: string;
  iat?: number;
  exp?: number;
}
