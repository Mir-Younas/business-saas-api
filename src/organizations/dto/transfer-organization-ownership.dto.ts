import { IsUUID } from 'class-validator';

export class TransferOrganizationOwnershipDto {
  @IsUUID()
  memberId!: string;
}
