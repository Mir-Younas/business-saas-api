import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OrganizationRole } from '../../generated/prisma/client';
import { OrganizationRoles } from '../decorators/organization-roles.decorator';
import { OrganizationRoleGuard } from '../guards/organization-role.guard';
import type { OrganizationAuthRequest } from '../organization.types';
import { CreateOrganizationInvitationDto } from './dto/create-organization-invitation.dto';
import { OrganizationInvitationsService } from './organization-invitations.service';

@UseGuards(JwtAuthGuard, OrganizationRoleGuard)
@Controller('organizations/:organizationId/invitations')
export class OrganizationInvitationsController {
  constructor(
    private readonly organizationInvitationsService: OrganizationInvitationsService,
  ) {}

  @Post()
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
}
