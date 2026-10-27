import { IsEnum } from 'class-validator';

import { MembershipStatus } from '../../../generated/prisma/client';

export class UpdateOrganizationMemberStatusDto {
  @IsEnum(MembershipStatus)
  status!: MembershipStatus;
}
