import { Module } from '@nestjs/common';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { OrganizationRoleGuard } from './guards/organization-role.guard';

@Module({
  controllers: [OrganizationsController],
  providers: [OrganizationsService, OrganizationRoleGuard],
})
export class OrganizationsModule {}
