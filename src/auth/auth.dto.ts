import { IsEmail, IsJWT, IsString, MaxLength, MinLength } from 'class-validator';
import { IsPasswordStrong } from '../common/validators';

export class LoginDto {
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(254)
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  @MaxLength(512)
  token: string;

  @IsString()
  @IsPasswordStrong()
  newPassword: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsJWT({ message: 'refreshToken must be a valid JWT' })
  refreshToken: string;
}
