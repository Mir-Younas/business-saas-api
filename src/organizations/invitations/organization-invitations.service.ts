import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { handlePrismaUniqueError } from '../../common/utils/handle-prisma-unique-error';
import { createSecureToken } from '../../common/utils/secure-token.util';
import { EmailService } from '../../email/email.service';
import {
  OrganizationInvitationStatus,
  OrganizationRole,
} from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrganizationInvitationDto } from './dto/create-organization-invitation.dto';
import { ORGANIZATION_INVITATION_EXPIRES_IN_MS } from 'src/auth/constants/auth.constants';
import { OrganizationAuthRequest } from '../organization.types';

@Injectable()
export class OrganizationInvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

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

    const existingMember = await this.prisma.organizationMember.findFirst({
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
    });

    if (existingMember) {
      throw new ConflictException(
        'User is already a member of this organization',
      );
    }

    const existingInvitation =
      await this.prisma.organizationInvitation.findUnique({
        where: {
          organizationId_email: {
            organizationId,
            email: body.email,
          },
        },
      });

    if (
      existingInvitation?.status === OrganizationInvitationStatus.PENDING &&
      existingInvitation.expiresAt > new Date()
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
        ? await this.prisma.organizationInvitation.update({
            where: {
              id: existingInvitation.id,
            },
            data: {
              role: body.role,
              status: OrganizationInvitationStatus.PENDING,
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
          })
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

      await this.emailService.sendOrganizationInvitationEmail({
        to: body.email,
        organizationName: requesterMembership.organization.name,
        inviterName: requesterMembership.user.name,
        role: body.role,
        invitationUrl: invitationUrl.toString(),
      });

      return invitation;
    } catch (error: unknown) {
      handlePrismaUniqueError(
        error,
        'An invitation already exists for this email',
      );
    }
  }
}
