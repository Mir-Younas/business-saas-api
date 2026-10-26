import type { AuthRequest } from '../auth/auth.types';
import type { OrganizationRole } from '../generated/prisma/client';

export interface OrganizationAuthRequest extends AuthRequest {
  organizationMembership: {
    id: string;
    role: OrganizationRole;
    user: {
      name: string;
    };
    organization: {
      name: string;
    };
  };
}
