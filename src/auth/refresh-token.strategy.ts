import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('jwt.refreshSecret'),
    });
  }

  validate(payload: { sub: string; email: string; type: string }) {
    if (payload.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    return { id: payload.sub, email: payload.email };
  }
}
