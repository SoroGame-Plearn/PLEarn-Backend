import { IsEmail, IsString, IsOptional, IsUrl, MinLength, MaxLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  username: string;

  @IsString()
  @MinLength(8)
  password: string;
}

export class UpdateUserDto {
  @IsString()
  username?: string;

  @IsString()
  stellarPublicKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsUrl()
  profilePictureUrl?: string;
}

export interface ProfileCompletionItem {
  key: string;
  label: string;
  completed: boolean;
}

export class ProfileCompletionDto {
  percentage: number;
  isComplete: boolean;
  items: ProfileCompletionItem[];
  achievedAt: Date | null;
}
