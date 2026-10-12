import type { Request } from 'express';

import type { PlatformRole, UserStatus } from '../generated/prisma/client';

export type JwtPayload = {
  sub: string;
};

export interface AuthRequest extends Request {
  user: {
    id: string;
    name: string;
    email: string;
    platformRole: PlatformRole;
    status: UserStatus;
    isEmailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
}

export type GoogleUser = {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
};

export interface GoogleAuthRequest extends Request {
  user: GoogleUser;
}
