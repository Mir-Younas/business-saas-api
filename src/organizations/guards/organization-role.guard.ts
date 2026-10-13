import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { AuthRequest } from '../../auth/auth.types';
import {
  MembershipStatus,
  OrganizationRole,
} from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ORGANIZATION_ROLES_KEY } from '../decorators/organization-roles.decorator';

@Injectable()
export class OrganizationRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<OrganizationRole[]>(
      ORGANIZATION_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest<AuthRequest>();

    const organizationId = request.params.organizationId;

    if (typeof organizationId !== 'string') {
      throw new BadRequestException('Invalid organization ID');
    }

    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        userId: request.user.id,
        organizationId,
        status: MembershipStatus.ACTIVE,
        organization: {
          is: {
            deletedAt: null,
          },
        },
      },
      select: {
        role: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'You do not have access to this organization',
      );
    }

    if (requiredRoles?.length && !requiredRoles.includes(membership.role)) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }

    return true;
  }
}
