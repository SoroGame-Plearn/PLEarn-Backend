import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateUserPreferencesDto } from './user-preferences.dto';
import { Theme, Visibility } from './user-preferences.entity';

describe('UpdateUserPreferencesDto', () => {
  it('accepts an empty payload (all fields optional)', async () => {
    const dto = plainToInstance(UpdateUserPreferencesDto, {});
    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepts a fully valid payload', async () => {
    const dto = plainToInstance(UpdateUserPreferencesDto, {
      emailNotificationsEnabled: false,
      theme: Theme.DARK,
      language: 'en-US',
      profileVisibility: Visibility.PRIVATE,
      activityVisibility: Visibility.FRIENDS_ONLY,
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepts a two-letter language code without a region', async () => {
    const dto = plainToInstance(UpdateUserPreferencesDto, { language: 'fr' });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects a non-boolean emailNotificationsEnabled', async () => {
    const dto = plainToInstance(UpdateUserPreferencesDto, { emailNotificationsEnabled: 'yes' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'emailNotificationsEnabled')).toBe(true);
  });

  it('rejects an invalid theme', async () => {
    const dto = plainToInstance(UpdateUserPreferencesDto, { theme: 'neon' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'theme')).toBe(true);
  });

  it('rejects a malformed language code', async () => {
    const dto = plainToInstance(UpdateUserPreferencesDto, { language: 'english' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'language')).toBe(true);
  });

  it('rejects an invalid profileVisibility', async () => {
    const dto = plainToInstance(UpdateUserPreferencesDto, { profileVisibility: 'everyone' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'profileVisibility')).toBe(true);
  });

  it('rejects an invalid activityVisibility', async () => {
    const dto = plainToInstance(UpdateUserPreferencesDto, { activityVisibility: 'everyone' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'activityVisibility')).toBe(true);
  });
});
