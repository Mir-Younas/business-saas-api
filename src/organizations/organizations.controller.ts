import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { AuthRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationRole } from '../generated/prisma/client';
import { OrganizationRoles } from './decorators/organization-roles.decorator';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationRoleGuard } from './guards/organization-role.guard';
import { OrganizationsService } from './organizations.service';
import type { OrganizationAuthRequest } from './organization.types';
import { TransferOrganizationOwnershipDto } from './dto/transfer-organization-ownership.dto';

@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  async create(@Req() req: AuthRequest, @Body() body: CreateOrganizationDto) {
    const organization = await this.organizationsService.create(
      req.user.id,
      body,
    );

    return {
      message: 'Organization created successfully',
      organization,
    };
  }

  @Get()
  async findMyOrganizations(@Req() req: AuthRequest) {
    const organizations = await this.organizationsService.findMyOrganizations(
      req.user.id,
    );

    return {
      organizations,
    };
  }

  @Get('deleted')
  async findDeletedOrganizations(@Req() req: AuthRequest) {
    const organizations =
      await this.organizationsService.findDeletedOrganizations(req.user.id);

    return {
      organizations,
    };
  }

  @Get(':organizationId')
  @UseGuards(OrganizationRoleGuard)
  async findOne(@Param('organizationId') organizationId: string) {
    return this.organizationsService.findOne(organizationId);
  }

  @Patch(':organizationId')
  @UseGuards(OrganizationRoleGuard)
  @OrganizationRoles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  async update(
    @Param('organizationId') organizationId: string,
    @Body() body: UpdateOrganizationDto,
  ) {
    const organization = await this.organizationsService.update(
      organizationId,
      body,
    );

    return {
      message: 'Organization updated successfully',
      organization,
    };
  }

  @Patch(':organizationId/restore')
  async restore(
    @Req() req: AuthRequest,
    @Param('organizationId') organizationId: string,
  ) {
    const organization = await this.organizationsService.restore(
      req.user.id,
      organizationId,
    );

    return {
      message: 'Organization restored successfully',
      organization,
    };
  }

  @Delete(':organizationId')
  @UseGuards(OrganizationRoleGuard)
  @OrganizationRoles(OrganizationRole.OWNER)
  async remove(@Param('organizationId') organizationId: string) {
    const organization = await this.organizationsService.remove(organizationId);

    return {
      message: 'Organization deleted successfully',
      organization,
    };
  }

  @Patch(':organizationId/ownership')
  @UseGuards(OrganizationRoleGuard)
  @OrganizationRoles(OrganizationRole.OWNER)
  async transferOwnership(
    @Req() req: OrganizationAuthRequest,
    @Param('organizationId') organizationId: string,
    @Body() body: TransferOrganizationOwnershipDto,
  ) {
    const result = await this.organizationsService.transferOwnership(
      organizationId,
      req.organizationMembership,
      body.memberId,
    );

    return {
      message: 'Organization ownership transferred successfully',
      ...result,
    };
  }
}
