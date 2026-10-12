import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { ACCESS_TOKEN_EXPIRES_IN_SECONDS } from '../constants/auth.constants';

export async function createAccessToken(
  jwtService: JwtService,
  configService: ConfigService,
  userId: string,
): Promise<string> {
  return jwtService.signAsync(
    {
      sub: userId,
    },
    {
      secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
    },
  );
}
