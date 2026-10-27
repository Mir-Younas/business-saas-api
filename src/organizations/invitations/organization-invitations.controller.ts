import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { AuthRequest } from '../../auth/auth.types';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OrganizationRole } from '../../generated/prisma/client';
import { OrganizationRoles } from '../decorators/organization-roles.decorator';
import { OrganizationRoleGuard } from '../guards/organization-role.guard';
import type { OrganizationAuthRequest } from '../organization.types';
import { CreateOrganizationInvitationDto } from './dto/create-organization-invitation.dto';
import { ProcessOrganizationInvitationDto } from './dto/process-organization-invitation.dto';
import { OrganizationInvitationsService } from './organization-invitations.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class OrganizationInvitationsController {
  constructor(
    private readonly organizationInvitationsService: OrganizationInvitationsService,
  ) {}

  @Post('organizations/:organizationId/invitations')
  @UseGuards(OrganizationRoleGuard)
  @OrganizationRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  async create(
    @Req() req: OrganizationAuthRequest,
    @Param('organizationId') organizationId: string,
    @Body() body: CreateOrganizationInvitationDto,
  ) {
    const invitation = await this.organizationInvitationsService.create(
      req.user.id,
      organizationId,
      req.organizationMembership,
      body,
    );

    return {
      message: 'Organization invitation created successfully',
      invitation,
    };
  }

  @Get('organizations/:organizationId/invitations')
  @UseGuards(OrganizationRoleGuard)
  @OrganizationRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  async findAll(@Param('organizationId') organizationId: string) {
    const invitations =
      await this.organizationInvitationsService.findAll(organizationId);

    return {
      invitations,
    };
  }

  @Post('organizations/:organizationId/invitations/:invitationId/resend')
  @UseGuards(OrganizationRoleGuard)
  @OrganizationRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  async resend(
    @Req() req: OrganizationAuthRequest,
    @Param('organizationId') organizationId: string,
    @Param('invitationId') invitationId: string,
  ) {
    const invitation = await this.organizationInvitationsService.resend(
      organizationId,
      invitationId,
      req.organizationMembership,
    );

    return {
      message: 'Organization invitation resent successfully',
      invitation,
    };
  }

  @Delete('organizations/:organizationId/invitations/:invitationId')
  @UseGuards(OrganizationRoleGuard)
  @OrganizationRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  async cancel(
    @Req() req: OrganizationAuthRequest,
    @Param('organizationId') organizationId: string,
    @Param('invitationId') invitationId: string,
  ) {
    const invitation = await this.organizationInvitationsService.cancel(
      req.user.id,
      organizationId,
      invitationId,
    );

    return {
      message: 'Organization invitation cancelled successfully',
      invitation,
    };
  }

  @Post('organization-invitations/accept')
  async accept(
    @Req() req: AuthRequest,
    @Body() body: ProcessOrganizationInvitationDto,
  ) {
    const membership = await this.organizationInvitationsService.accept(
      req.user.id,
      req.user.email,
      req.user.isEmailVerified,
      body.token,
    );

    return {
      message: 'Organization invitation accepted successfully',
      membership,
    };
  }

  @Post('organization-invitations/decline')
  async decline(
    @Req() req: AuthRequest,
    @Body() body: ProcessOrganizationInvitationDto,
  ) {
    const invitation = await this.organizationInvitationsService.decline(
      req.user.email,
      body.token,
    );

    return {
      message: 'Organization invitation declined successfully',
      invitation,
    };
  }
}
