import { IsNotEmpty, IsString } from 'class-validator';

export class ProcessOrganizationInvitationDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}
