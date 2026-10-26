import { Module } from '@nestjs/common';

import { EmailModule } from '../email/email.module';
import { OrganizationRoleGuard } from './guards/organization-role.guard';
import { OrganizationInvitationsController } from './invitations/organization-invitations.controller';
import { OrganizationInvitationsService } from './invitations/organization-invitations.service';
import { OrganizationMembersController } from './members/organization-members.controller';
import { OrganizationMembersService } from './members/organization-members.service';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

@Module({
  imports: [EmailModule],
  controllers: [
    OrganizationsController,
    OrganizationMembersController,
    OrganizationInvitationsController,
  ],
  providers: [
    OrganizationsService,
    OrganizationMembersService,
    OrganizationInvitationsService,
    OrganizationRoleGuard,
  ],
})
export class OrganizationsModule {}
