import { Controller, Get, Param, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OrganizationRole } from '../../generated/prisma/client';
import { OrganizationRoles } from '../decorators/organization-roles.decorator';
import { OrganizationRoleGuard } from '../guards/organization-role.guard';
import { OrganizationMembersService } from './organization-members.service';

@UseGuards(JwtAuthGuard, OrganizationRoleGuard)
@Controller('organizations/:organizationId/members')
export class OrganizationMembersController {
  constructor(
    private readonly organizationMembersService: OrganizationMembersService,
  ) {}

  @Get()
  @OrganizationRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  async findMembers(@Param('organizationId') organizationId: string) {
    const members =
      await this.organizationMembersService.findMembers(organizationId);

    return {
      members,
    };
  }
}
