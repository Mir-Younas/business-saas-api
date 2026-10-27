import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  MembershipStatus,
  OrganizationRole,
} from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { OrganizationAuthRequest } from '../organization.types';

@Injectable()
export class OrganizationMembersService {
  constructor(private readonly prisma: PrismaService) {}

  private async getMemberForManagement(
    organizationId: string,
    memberId: string,
    requesterMembership: OrganizationAuthRequest['organizationMembership'],
  ) {
    const member = await this.prisma.organizationMember.findFirst({
      where: {
        id: memberId,
        organizationId,
      },
      select: {
        id: true,
        userId: true,
        role: true,
        status: true,
      },
    });

    if (!member) {
      throw new NotFoundException('Organization member not found');
    }

    if (member.id === requesterMembership.id) {
      throw new ForbiddenException('You cannot modify your own membership');
    }

    if (member.role === OrganizationRole.OWNER) {
      throw new ForbiddenException('Organization owner cannot be modified');
    }

    if (
      requesterMembership.role === OrganizationRole.ADMIN &&
      member.role === OrganizationRole.ADMIN
    ) {
      throw new ForbiddenException('An admin cannot modify another admin');
    }

    return member;
  }

  async findMembers(organizationId: string) {
    return this.prisma.organizationMember.findMany({
      where: {
        organizationId,
      },
      select: {
        id: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findOne(organizationId: string, memberId: string) {
    const member = await this.prisma.organizationMember.findFirst({
      where: {
        id: memberId,
        organizationId,
      },
      select: {
        id: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isEmailVerified: true,
          },
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Organization member not found');
    }

    return member;
  }

  async updateRole(
    organizationId: string,
    memberId: string,
    requesterMembership: OrganizationAuthRequest['organizationMembership'],
    role: OrganizationRole,
  ) {
    if (role === OrganizationRole.OWNER) {
      throw new BadRequestException('Owner role cannot be assigned');
    }

    const member = await this.getMemberForManagement(
      organizationId,
      memberId,
      requesterMembership,
    );

    if (
      requesterMembership.role === OrganizationRole.ADMIN &&
      role === OrganizationRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Only the organization owner can assign the admin role',
      );
    }

    if (member.role === role) {
      throw new ConflictException(`Member already has the ${role} role`);
    }

    return this.prisma.organizationMember.update({
      where: {
        id: member.id,
      },
      data: {
        role,
      },
      select: {
        id: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async updateStatus(
    organizationId: string,
    memberId: string,
    requesterMembership: OrganizationAuthRequest['organizationMembership'],
    status: MembershipStatus,
  ) {
    const member = await this.getMemberForManagement(
      organizationId,
      memberId,
      requesterMembership,
    );

    if (member.status === status) {
      throw new ConflictException(`Member already has the ${status} status`);
    }

    return this.prisma.organizationMember.update({
      where: {
        id: member.id,
      },
      data: {
        status,
      },
      select: {
        id: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async remove(
    userId: string,
    organizationId: string,
    memberId: string,
    requesterMembership: OrganizationAuthRequest['organizationMembership'],
  ) {
    const member = await this.getMemberForManagement(
      organizationId,
      memberId,
      requesterMembership,
    );

    if (member.userId === userId) {
      throw new ForbiddenException('You cannot remove your own membership');
    }

    const deletedMember = await this.prisma.organizationMember.delete({
      where: {
        id: member.id,
      },
      select: {
        id: true,
        role: true,
        status: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return deletedMember;
  }

  async leave(userId: string, organizationId: string) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!membership) {
      throw new NotFoundException('Organization membership not found');
    }

    if (membership.role === OrganizationRole.OWNER) {
      throw new ForbiddenException(
        'Organization owner must transfer ownership before leaving',
      );
    }

    await this.prisma.organizationMember.delete({
      where: {
        id: membership.id,
      },
    });
  }
}
