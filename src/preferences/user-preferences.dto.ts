import { IsBoolean, IsEnum, IsOptional, Matches } from 'class-validator';
import { Theme, Visibility } from './user-preferences.entity';

const LANGUAGE_RE = /^[a-z]{2}(-[A-Z]{2})?$/;

export class UpdateUserPreferencesDto {
  @IsOptional()
  @IsBoolean({ message: 'emailNotificationsEnabled must be a boolean' })
  emailNotificationsEnabled?: boolean;

  @IsOptional()
  @IsEnum(Theme, { message: `theme must be one of: ${Object.values(Theme).join(', ')}` })
  theme?: Theme;

  @IsOptional()
  @Matches(LANGUAGE_RE, {
    message: 'language must be a valid locale code, e.g. "en" or "en-US"',
  })
  language?: string;

  @IsOptional()
  @IsEnum(Visibility, {
    message: `profileVisibility must be one of: ${Object.values(Visibility).join(', ')}`,
  })
  profileVisibility?: Visibility;

  @IsOptional()
  @IsEnum(Visibility, {
    message: `activityVisibility must be one of: ${Object.values(Visibility).join(', ')}`,
  })
  activityVisibility?: Visibility;
}
