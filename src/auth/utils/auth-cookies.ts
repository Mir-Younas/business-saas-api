import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';

import {
  ACCESS_TOKEN_COOKIE_MAX_AGE_MS,
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_MAX_AGE_MS,
  REFRESH_TOKEN_COOKIE_NAME,
} from '../constants/auth.constants';

function getCookieOptions(configService: ConfigService): CookieOptions {
  const isProduction = configService.get<string>('NODE_ENV') === 'production';

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  };
}

export function setAccessTokenCookie(
  res: Response,
  configService: ConfigService,
  accessToken: string,
): void {
  res.cookie(ACCESS_TOKEN_COOKIE_NAME, accessToken, {
    ...getCookieOptions(configService),
    maxAge: ACCESS_TOKEN_COOKIE_MAX_AGE_MS,
  });
}

export function setAuthCookies(
  res: Response,
  configService: ConfigService,
  accessToken: string,
  refreshToken: string,
): void {
  const options = getCookieOptions(configService);

  res.cookie(ACCESS_TOKEN_COOKIE_NAME, accessToken, {
    ...options,
    maxAge: ACCESS_TOKEN_COOKIE_MAX_AGE_MS,
  });

  res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
    ...options,
    maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE_MS,
  });
}

export function clearAuthCookies(
  res: Response,
  configService: ConfigService,
): void {
  const options = getCookieOptions(configService);

  res.clearCookie(ACCESS_TOKEN_COOKIE_NAME, options);
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, options);
}
