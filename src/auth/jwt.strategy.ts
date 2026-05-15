import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AccessTokenPayload } from './types/access-token-payload.type';

interface RequestWithQueryToken {
  query?: {
    access_token?: unknown;
  };
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        extractAccessTokenFromQuery,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  validate(payload: AccessTokenPayload) {
    return payload;
  }
}

function extractAccessTokenFromQuery(request: RequestWithQueryToken) {
  const token = request.query?.access_token;

  return typeof token === 'string' ? token : null;
}
