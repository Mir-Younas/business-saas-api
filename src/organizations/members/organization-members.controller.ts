import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OrganizationRole } from '../../generated/prisma/client';
import { OrganizationRoles } from '../decorators/organization-roles.decorator';
import { OrganizationRoleGuard } from '../guards/organization-role.guard';
import type { OrganizationAuthRequest } from '../organization.types';
import { UpdateOrganizationMemberRoleDto } from './dto/update-organization-member-role.dto';
import { UpdateOrganizationMemberStatusDto } from './dto/update-organization-member-status.dto';
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

  @Get(':memberId')
  @OrganizationRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  async findOne(
    @Param('organizationId') organizationId: string,
    @Param('memberId') memberId: string,
  ) {
    const member = await this.organizationMembersService.findOne(
      organizationId,
      memberId,
    );

    return {
      member,
    };
  }

  @Patch(':memberId/role')
  @OrganizationRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  async updateRole(
    @Req() req: OrganizationAuthRequest,
    @Param('organizationId') organizationId: string,
    @Param('memberId') memberId: string,
    @Body() body: UpdateOrganizationMemberRoleDto,
  ) {
    const member = await this.organizationMembersService.updateRole(
      organizationId,
      memberId,
      req.organizationMembership,
      body.role,
    );

    return {
      message: 'Organization member role updated successfully',
      member,
    };
  }

  @Patch(':memberId/status')
  @OrganizationRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  async updateStatus(
    @Req() req: OrganizationAuthRequest,
    @Param('organizationId') organizationId: string,
    @Param('memberId') memberId: string,
    @Body() body: UpdateOrganizationMemberStatusDto,
  ) {
    const member = await this.organizationMembersService.updateStatus(
      organizationId,
      memberId,
      req.organizationMembership,
      body.status,
    );

    return {
      message: 'Organization member status updated successfully',
      member,
    };
  }

  @Delete('me')
  async leave(
    @Req() req: OrganizationAuthRequest,
    @Param('organizationId') organizationId: string,
  ) {
    await this.organizationMembersService.leave(req.user.id, organizationId);

    return {
      message: 'You have left the organization successfully',
    };
  }

  @Delete(':memberId')
  @OrganizationRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  async remove(
    @Req() req: OrganizationAuthRequest,
    @Param('organizationId') organizationId: string,
    @Param('memberId') memberId: string,
  ) {
    const member = await this.organizationMembersService.remove(
      req.user.id,
      organizationId,
      memberId,
      req.organizationMembership,
    );

    return {
      message: 'Organization member removed successfully',
      member,
    };
  }
}
