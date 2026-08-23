import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { IsPasswordStrong, IsStellarPublicKey } from '../common/validators';

const USERNAME_RE = /^[a-zA-Z0-9_]+$/;

export class CreateUserDto {
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(3, { message: 'username must be at least 3 characters' })
  @MaxLength(30, { message: 'username must be at most 30 characters' })
  @Matches(USERNAME_RE, {
    message: 'username may only contain letters, numbers, and underscores',
  })
  username: string;

  @IsString()
  @IsPasswordStrong()
  password: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'username must be at least 3 characters' })
  @MaxLength(30, { message: 'username must be at most 30 characters' })
  @Matches(USERNAME_RE, {
    message: 'username may only contain letters, numbers, and underscores',
  })
  username?: string;

  @IsOptional()
  @IsStellarPublicKey()
  stellarPublicKey?: string;
}
