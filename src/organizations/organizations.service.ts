import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { MembershipStatus, OrganizationRole } from '../generated/prisma/client';
import { createSlug } from '../common/utils/create-slug';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { handlePrismaUniqueError } from '../common/utils/handle-prisma-unique-error';
import { OrganizationAuthRequest } from './organization.types';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, body: CreateOrganizationDto) {
    const slug = createSlug(body.name);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: {
            name: body.name,
            slug,
          },
          select: {
            id: true,
            name: true,
            slug: true,
            createdAt: true,
          },
        });

        await tx.organizationMember.create({
          data: {
            userId,
            organizationId: organization.id,
            role: OrganizationRole.OWNER,
          },
        });

        return organization;
      });
    } catch (error: unknown) {
      handlePrismaUniqueError(
        error,
        'An organization with this name already exists',
      );
    }
  }

  async findMyOrganizations(userId: string) {
    return this.prisma.organizationMember.findMany({
      where: {
        userId,
        status: MembershipStatus.ACTIVE,
        organization: {
          is: {
            deletedAt: null,
          },
        },
      },
      select: {
        role: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(organizationId: string) {
    return this.prisma.organization.findFirst({
      where: {
        id: organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async update(organizationId: string, body: UpdateOrganizationDto) {
    const organization = await this.prisma.organization.findUnique({
      where: {
        id: organizationId,
      },
      select: {
        name: true,
      },
    });

    if (!body.name || body.name === organization?.name) {
      return;
    }

    const slug = createSlug(body.name);

    try {
      return await this.prisma.organization.update({
        where: {
          id: organizationId,
        },
        data: {
          name: body.name,
          slug,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error: unknown) {
      handlePrismaUniqueError(
        error,
        'An organization with this name already exists',
      );
    }
  }

  async remove(organizationId: string) {
    return this.prisma.organization.update({
      where: {
        id: organizationId,
      },
      data: {
        deletedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        deletedAt: true,
      },
    });
  }

  async findDeletedOrganizations(userId: string) {
    return this.prisma.organizationMember.findMany({
      where: {
        userId,
        role: OrganizationRole.OWNER,
        status: MembershipStatus.ACTIVE,
        organization: {
          is: {
            deletedAt: {
              not: null,
            },
          },
        },
      },
      select: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            deletedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: {
        organization: {
          deletedAt: 'desc',
        },
      },
    });
  }

  async restore(userId: string, organizationId: string) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      select: {
        role: true,
        status: true,
        organization: {
          select: {
            deletedAt: true,
          },
        },
      },
    });

    if (
      !membership ||
      membership.status !== MembershipStatus.ACTIVE ||
      membership.role !== OrganizationRole.OWNER
    ) {
      throw new ForbiddenException(
        'You do not have permission to restore this organization',
      );
    }

    if (!membership.organization.deletedAt) {
      throw new ConflictException('Organization is already active');
    }

    return this.prisma.organization.update({
      where: {
        id: organizationId,
      },
      data: {
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async transferOwnership(
    organizationId: string,
    requesterMembership: OrganizationAuthRequest['organizationMembership'],
    targetMemberId: string,
  ) {
    if (requesterMembership.id === targetMemberId) {
      throw new BadRequestException('You are already the organization owner');
    }

    const targetMember = await this.prisma.organizationMember.findFirst({
      where: {
        id: targetMemberId,
        organizationId,
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

    if (!targetMember) {
      throw new NotFoundException('Organization member not found');
    }

    if (targetMember.status !== MembershipStatus.ACTIVE) {
      throw new ConflictException(
        'Ownership can only be transferred to an active member',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const currentOwner = await tx.organizationMember.updateMany({
        where: {
          id: requesterMembership.id,
          organizationId,
          role: OrganizationRole.OWNER,
        },
        data: {
          role: OrganizationRole.ADMIN,
        },
      });

      if (currentOwner.count !== 1) {
        throw new ConflictException(
          'Organization ownership has already changed',
        );
      }

      const newOwner = await tx.organizationMember.update({
        where: {
          id: targetMember.id,
        },
        data: {
          role: OrganizationRole.OWNER,
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

      return {
        newOwner,
      };
    });
  }
}
