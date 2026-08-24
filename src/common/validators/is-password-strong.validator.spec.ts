import { validate } from 'class-validator';
import { IsPasswordStrong } from './is-password-strong.validator';

class TestDto {
  @IsPasswordStrong()
  password: string;
}

async function validatePassword(value: unknown): Promise<boolean> {
  const dto = new TestDto();
  (dto as { password: unknown }).password = value;
  const errors = await validate(dto);
  return errors.length === 0;
}

describe('IsPasswordStrong', () => {
  it('accepts a password with upper, lower, and digit at min length', async () => {
    expect(await validatePassword('Passw0rd')).toBe(true);
  });

  it('rejects a password shorter than 8 characters', async () => {
    expect(await validatePassword('Sh0rt')).toBe(false);
  });

  it('rejects a password longer than 128 characters', async () => {
    expect(await validatePassword('A1' + 'a'.repeat(127))).toBe(false);
  });

  it('rejects a password with no uppercase letter', async () => {
    expect(await validatePassword('password1')).toBe(false);
  });

  it('rejects a password with no lowercase letter', async () => {
    expect(await validatePassword('PASSWORD1')).toBe(false);
  });

  it('rejects a password with no digit', async () => {
    expect(await validatePassword('PasswordOnly')).toBe(false);
  });

  it('rejects an empty string', async () => {
    expect(await validatePassword('')).toBe(false);
  });

  it('rejects non-string values', async () => {
    expect(await validatePassword(12345678)).toBe(false);
    expect(await validatePassword(null)).toBe(false);
    expect(await validatePassword(undefined)).toBe(false);
  });
});
