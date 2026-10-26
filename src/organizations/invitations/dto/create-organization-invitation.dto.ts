import { IsEmail, IsEnum } from 'class-validator';

import { NormalizeEmail } from '../../../common/decorators/string-transform.decorator';
import { OrganizationRole } from '../../../generated/prisma/client';

export class CreateOrganizationInvitationDto {
  @NormalizeEmail()
  @IsEmail()
  email!: string;

  @IsEnum(OrganizationRole)
  role!: OrganizationRole;
}
