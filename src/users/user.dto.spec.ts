import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { Keypair } from '@stellar/stellar-sdk';
import { CreateUserDto, UpdateUserDto } from './user.dto';

describe('CreateUserDto', () => {
  const valid = {
    email: 'user@example.com',
    username: 'valid_user1',
    password: 'Passw0rd123',
  };

  it('accepts a fully valid payload', async () => {
    const dto = plainToInstance(CreateUserDto, valid);
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects an invalid email format', async () => {
    const dto = plainToInstance(CreateUserDto, { ...valid, email: 'not-an-email' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('rejects an empty username', async () => {
    const dto = plainToInstance(CreateUserDto, { ...valid, username: '' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'username')).toBe(true);
  });

  it('rejects a username with SQL-injection style payload', async () => {
    const dto = plainToInstance(CreateUserDto, {
      ...valid,
      username: "'; DROP TABLE users; --",
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'username')).toBe(true);
  });

  it('rejects an excessively long username', async () => {
    const dto = plainToInstance(CreateUserDto, { ...valid, username: 'a'.repeat(100) });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'username')).toBe(true);
  });

  it('rejects a weak password', async () => {
    const dto = plainToInstance(CreateUserDto, { ...valid, password: '1234' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });
});

describe('UpdateUserDto', () => {
  it('accepts an empty payload (all fields optional)', async () => {
    const dto = plainToInstance(UpdateUserDto, {});
    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepts a valid Stellar public key', async () => {
    const dto = plainToInstance(UpdateUserDto, {
      stellarPublicKey: Keypair.random().publicKey(),
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects an invalid Stellar public key', async () => {
    const dto = plainToInstance(UpdateUserDto, { stellarPublicKey: 'not-a-key' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'stellarPublicKey')).toBe(true);
  });
});
