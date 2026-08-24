import { validate } from 'class-validator';
import { Keypair } from '@stellar/stellar-sdk';
import { IsStellarPublicKey } from './is-stellar-public-key.validator';

class TestDto {
  @IsStellarPublicKey()
  stellarPublicKey: string;
}

async function validateKey(value: unknown): Promise<boolean> {
  const dto = new TestDto();
  (dto as { stellarPublicKey: unknown }).stellarPublicKey = value;
  const errors = await validate(dto);
  return errors.length === 0;
}

describe('IsStellarPublicKey', () => {
  it('accepts a valid ed25519 public key', async () => {
    const publicKey = Keypair.random().publicKey();
    expect(await validateKey(publicKey)).toBe(true);
  });

  it('rejects a secret key (starts with S) used by mistake', async () => {
    const secretKey = Keypair.random().secret();
    expect(await validateKey(secretKey)).toBe(false);
  });

  it('rejects an empty string', async () => {
    expect(await validateKey('')).toBe(false);
  });

  it('rejects a malformed / truncated key', async () => {
    expect(await validateKey('GARBAGE_NOT_A_KEY')).toBe(false);
  });

  it('rejects a key with an invalid checksum', async () => {
    const publicKey = Keypair.random().publicKey();
    const tampered = 'G' + publicKey.slice(1, -1) + (publicKey.slice(-1) === 'A' ? 'B' : 'A');
    expect(await validateKey(tampered)).toBe(false);
  });

  it('rejects non-string values', async () => {
    expect(await validateKey(12345)).toBe(false);
    expect(await validateKey(null)).toBe(false);
    expect(await validateKey(undefined)).toBe(false);
  });

  it("rejects a SQL-injection style string", async () => {
    expect(await validateKey("'; DROP TABLE users; --")).toBe(false);
  });
});
