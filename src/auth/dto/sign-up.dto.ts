import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsStrongPassword,
  MaxLength,
  MinLength,
} from 'class-validator';

import {
  NormalizeEmail,
  ToTrim,
} from '../../common/decorators/string-transform.decorator';

export class SignUpDto {
  @ToTrim()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  name!: string;

  @NormalizeEmail()
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(72, {
    message: 'Password must not exceed 72 characters.',
  })
  @IsStrongPassword(
    {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    {
      message:
        'Password must be at least 8 characters long and include uppercase, lowercase, number, and symbol.',
    },
  )
  password!: string;
}
