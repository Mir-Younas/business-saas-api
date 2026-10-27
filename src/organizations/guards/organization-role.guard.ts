import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import {
  MembershipStatus,
  OrganizationRole,
} from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { OrganizationAuthRequest } from '../organization.types';
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

    const request = context
      .switchToHttp()
      .getRequest<OrganizationAuthRequest>();

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
        id: true,
        role: true,
        user: {
          select: {
            name: true,
          },
        },
        organization: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('Organization not found');
    }

    if (requiredRoles?.length && !requiredRoles.includes(membership.role)) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }

    request.organizationMembership = membership;

    return true;
  }
}
