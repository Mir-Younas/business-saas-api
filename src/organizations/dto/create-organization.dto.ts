import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

import { ToTrim } from '../../common/decorators/string-transform.decorator';

export class CreateOrganizationDto {
  @ToTrim()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name!: string;
}
