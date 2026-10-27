import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { handlePrismaUniqueError } from '../../common/utils/handle-prisma-unique-error';
import {
  createSecureToken,
  hashToken,
} from '../../common/utils/secure-token.util';
import { EmailService } from '../../email/email.service';
import {
  OrganizationInvitationStatus,
  OrganizationRole,
} from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { OrganizationAuthRequest } from '../organization.types';
import { CreateOrganizationInvitationDto } from './dto/create-organization-invitation.dto';
import { ORGANIZATION_INVITATION_EXPIRES_IN_MS } from './organization-invitations.constants';

@Injectable()
export class OrganizationInvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  private async getValidPendingInvitationForUser(
    rawToken: string,
    userEmail: string,
  ) {
    const tokenHash = hashToken(
      rawToken,
      this.configService.getOrThrow<string>(
        'ORGANIZATION_INVITATION_TOKEN_HASH_SECRET',
      ),
    );

    const invitation = await this.prisma.organizationInvitation.findUnique({
      where: {
        tokenHash,
      },
      select: {
        id: true,
        organizationId: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        organization: {
          select: {
            deletedAt: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new BadRequestException('Invalid invitation');
    }

    if (invitation.email !== userEmail) {
      throw new ForbiddenException(
        'This invitation belongs to a different email address',
      );
    }

    if (invitation.status !== OrganizationInvitationStatus.PENDING) {
      throw new ConflictException('Invitation is no longer pending');
    }

    if (invitation.expiresAt <= new Date()) {
      throw new BadRequestException('Invitation has expired');
    }

    if (invitation.organization.deletedAt) {
      throw new ConflictException('Organization is no longer available');
    }

    return invitation;
  }

  async create(
    userId: string,
    organizationId: string,
    requesterMembership: OrganizationAuthRequest['organizationMembership'],
    body: CreateOrganizationInvitationDto,
  ) {
    if (body.role === OrganizationRole.OWNER) {
      throw new BadRequestException(
        'Owner role cannot be assigned through an invitation',
      );
    }

    if (
      requesterMembership.role === OrganizationRole.ADMIN &&
      body.role === OrganizationRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Only the organization owner can invite an admin',
      );
    }

    const [existingMember, existingInvitation] = await Promise.all([
      this.prisma.organizationMember.findFirst({
        where: {
          organizationId,
          user: {
            is: {
              email: body.email,
            },
          },
        },
        select: {
          id: true,
        },
      }),

      this.prisma.organizationInvitation.findUnique({
        where: {
          organizationId_email: {
            organizationId,
            email: body.email,
          },
        },
        select: {
          id: true,
          status: true,
          expiresAt: true,
        },
      }),
    ]);

    if (existingMember) {
      throw new ConflictException(
        'User is already a member of this organization',
      );
    }

    const now = new Date();

    if (
      existingInvitation?.status === OrganizationInvitationStatus.PENDING &&
      existingInvitation.expiresAt > now
    ) {
      throw new ConflictException(
        'An invitation is already pending for this email',
      );
    }

    const { rawToken, tokenHash, expiresAt } = createSecureToken({
      secret: this.configService.getOrThrow<string>(
        'ORGANIZATION_INVITATION_TOKEN_HASH_SECRET',
      ),
      expiresInMs: ORGANIZATION_INVITATION_EXPIRES_IN_MS,
    });

    try {
      const invitation = existingInvitation
        ? await (async () => {
            const updatedInvitation =
              await this.prisma.organizationInvitation.updateMany({
                where: {
                  id: existingInvitation.id,
                  OR: [
                    {
                      status: {
                        not: OrganizationInvitationStatus.PENDING,
                      },
                    },
                    {
                      expiresAt: {
                        lte: now,
                      },
                    },
                  ],
                },
                data: {
                  role: body.role,
                  status: OrganizationInvitationStatus.PENDING,
                  tokenHash,
                  invitedByUserId: userId,
                  expiresAt,
                  respondedAt: null,
                  cancelledByUserId: null,
                  cancelledAt: null,
                },
              });

            if (updatedInvitation.count !== 1) {
              throw new ConflictException(
                'An invitation is already pending for this email',
              );
            }

            return this.prisma.organizationInvitation.findUniqueOrThrow({
              where: {
                id: existingInvitation.id,
              },
              select: {
                id: true,
                email: true,
                role: true,
                status: true,
                expiresAt: true,
                createdAt: true,
                updatedAt: true,
              },
            });
          })()
        : await this.prisma.organizationInvitation.create({
            data: {
              organizationId,
              email: body.email,
              role: body.role,
              tokenHash,
              invitedByUserId: userId,
              expiresAt,
            },
            select: {
              id: true,
              email: true,
              role: true,
              status: true,
              expiresAt: true,
              createdAt: true,
              updatedAt: true,
            },
          });

      const clientUrl = this.configService.getOrThrow<string>('CLIENT_URL');

      const invitationUrl = new URL(
        '/organization-invitations/accept',
        clientUrl,
      );

      invitationUrl.searchParams.set('token', rawToken);

      try {
        await this.emailService.sendOrganizationInvitationEmail({
          to: body.email,
          organizationName: requesterMembership.organization.name,
          inviterName: requesterMembership.user.name,
          role: body.role,
          invitationUrl: invitationUrl.toString(),
        });
      } catch (error: unknown) {
        await this.prisma.organizationInvitation.updateMany({
          where: {
            id: invitation.id,
            tokenHash,
            status: OrganizationInvitationStatus.PENDING,
          },
          data: {
            tokenHash: null,
            expiresAt: new Date(),
          },
        });

        throw error;
      }

      return invitation;
    } catch (error: unknown) {
      handlePrismaUniqueError(
        error,
        'An invitation already exists for this email',
      );
    }
  }

  async findAll(organizationId: string) {
    return this.prisma.organizationInvitation.findMany({
      where: {
        organizationId,
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        respondedAt: true,
        cancelledAt: true,
        createdAt: true,
        updatedAt: true,

        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        cancelledBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async resend(
    organizationId: string,
    invitationId: string,
    requesterMembership: OrganizationAuthRequest['organizationMembership'],
  ) {
    const invitation = await this.prisma.organizationInvitation.findFirst({
      where: {
        id: invitationId,
        organizationId,
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        tokenHash: true,
        expiresAt: true,
      },
    });

    if (!invitation) {
      throw new BadRequestException('Invitation not found');
    }

    if (invitation.status !== OrganizationInvitationStatus.PENDING) {
      throw new ConflictException('Only pending invitations can be resent');
    }

    if (
      requesterMembership.role === OrganizationRole.ADMIN &&
      invitation.role === OrganizationRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Only the organization owner can resend an admin invitation',
      );
    }

    const previousTokenHash = invitation.tokenHash;
    const previousExpiresAt = invitation.expiresAt;

    const { rawToken, tokenHash, expiresAt } = createSecureToken({
      secret: this.configService.getOrThrow<string>(
        'ORGANIZATION_INVITATION_TOKEN_HASH_SECRET',
      ),
      expiresInMs: ORGANIZATION_INVITATION_EXPIRES_IN_MS,
    });

    const updatedInvitation =
      await this.prisma.organizationInvitation.updateMany({
        where: {
          id: invitation.id,
          organizationId,
          status: OrganizationInvitationStatus.PENDING,
          tokenHash: previousTokenHash,
        },
        data: {
          tokenHash,
          expiresAt,
        },
      });

    if (updatedInvitation.count !== 1) {
      throw new ConflictException(
        'Invitation has already been changed or processed',
      );
    }

    const clientUrl = this.configService.getOrThrow<string>('CLIENT_URL');

    const invitationUrl = new URL(
      '/organization-invitations/accept',
      clientUrl,
    );

    invitationUrl.searchParams.set('token', rawToken);

    try {
      await this.emailService.sendOrganizationInvitationEmail({
        to: invitation.email,
        organizationName: requesterMembership.organization.name,
        inviterName: requesterMembership.user.name,
        role: invitation.role,
        invitationUrl: invitationUrl.toString(),
      });
    } catch (error: unknown) {
      await this.prisma.organizationInvitation.updateMany({
        where: {
          id: invitation.id,
          tokenHash,
          status: OrganizationInvitationStatus.PENDING,
        },
        data: {
          tokenHash: previousTokenHash,
          expiresAt: previousExpiresAt,
        },
      });

      throw error;
    }

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: OrganizationInvitationStatus.PENDING,
      expiresAt,
    };
  }

  async cancel(userId: string, organizationId: string, invitationId: string) {
    const invitation = await this.prisma.organizationInvitation.findFirst({
      where: {
        id: invitationId,
        organizationId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!invitation) {
      throw new BadRequestException('Invitation not found');
    }

    if (invitation.status !== OrganizationInvitationStatus.PENDING) {
      throw new ConflictException('Only pending invitations can be cancelled');
    }

    const now = new Date();

    const cancelledInvitation =
      await this.prisma.organizationInvitation.updateMany({
        where: {
          id: invitationId,
          organizationId,
          status: OrganizationInvitationStatus.PENDING,
        },
        data: {
          status: OrganizationInvitationStatus.CANCELLED,
          tokenHash: null,
          cancelledByUserId: userId,
          cancelledAt: now,
        },
      });

    if (cancelledInvitation.count !== 1) {
      throw new ConflictException('Invitation has already been processed');
    }

    return {
      id: invitationId,
      status: OrganizationInvitationStatus.CANCELLED,
      cancelledAt: now,
    };
  }

  async accept(
    userId: string,
    userEmail: string,
    isEmailVerified: boolean,
    rawToken: string,
  ) {
    if (!isEmailVerified) {
      throw new ForbiddenException(
        'Please verify your email before accepting an invitation',
      );
    }

    const invitation = await this.getValidPendingInvitationForUser(
      rawToken,
      userEmail,
    );

    const existingMember = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: invitation.organizationId,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingMember) {
      throw new ConflictException(
        'You are already a member of this organization',
      );
    }

    const now = new Date();

    try {
      return await this.prisma.$transaction(async (tx) => {
        const acceptedInvitation = await tx.organizationInvitation.updateMany({
          where: {
            id: invitation.id,
            status: OrganizationInvitationStatus.PENDING,
            expiresAt: {
              gt: now,
            },
          },
          data: {
            status: OrganizationInvitationStatus.ACCEPTED,
            tokenHash: null,
            respondedAt: now,
          },
        });

        if (acceptedInvitation.count !== 1) {
          throw new ConflictException(
            'Invitation has already been processed or expired',
          );
        }

        return tx.organizationMember.create({
          data: {
            userId,
            organizationId: invitation.organizationId,
            role: invitation.role,
          },
          select: {
            id: true,
            role: true,
            status: true,
            createdAt: true,
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        });
      });
    } catch (error: unknown) {
      handlePrismaUniqueError(
        error,
        'You are already a member of this organization',
      );
    }
  }

  async decline(userEmail: string, rawToken: string) {
    const invitation = await this.getValidPendingInvitationForUser(
      rawToken,
      userEmail,
    );

    const now = new Date();

    const declinedInvitation =
      await this.prisma.organizationInvitation.updateMany({
        where: {
          id: invitation.id,
          status: OrganizationInvitationStatus.PENDING,
          expiresAt: {
            gt: now,
          },
        },
        data: {
          status: OrganizationInvitationStatus.DECLINED,
          tokenHash: null,
          respondedAt: now,
        },
      });

    if (declinedInvitation.count !== 1) {
      throw new ConflictException(
        'Invitation has already been processed or expired',
      );
    }

    return {
      id: invitation.id,
      status: OrganizationInvitationStatus.DECLINED,
    };
  }
}
