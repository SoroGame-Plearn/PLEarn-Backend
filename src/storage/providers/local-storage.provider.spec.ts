import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { LocalStorageProvider } from './local-storage.provider';

describe('LocalStorageProvider', () => {
  let tempDir: string;
  let provider: LocalStorageProvider;
  let originalCwd: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'plearn-storage-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);

    const config = new ConfigService({
      storage: {
        local: {
          uploadDir: 'uploads',
          publicBaseUrl: 'http://localhost:3000',
        },
      },
    });
    provider = new LocalStorageProvider(config);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(tempDir, { recursive: true, force: true });
  });

  it('writes the file under the configured upload dir and returns a public URL', async () => {
    const result = await provider.upload({
      key: 'avatars/user-1/pic.jpg',
      body: Buffer.from('hello'),
      contentType: 'image/jpeg',
    });

    expect(result).toEqual({
      key: 'avatars/user-1/pic.jpg',
      url: 'http://localhost:3000/uploads/avatars/user-1/pic.jpg',
    });

    const written = await readFile(join(tempDir, 'uploads', 'avatars', 'user-1', 'pic.jpg'));
    expect(written.toString()).toBe('hello');
  });

  it('deletes a previously uploaded file', async () => {
    await provider.upload({
      key: 'avatars/user-1/pic.jpg',
      body: Buffer.from('hello'),
      contentType: 'image/jpeg',
    });

    await provider.delete('avatars/user-1/pic.jpg');

    await expect(readFile(join(tempDir, 'uploads', 'avatars', 'user-1', 'pic.jpg'))).rejects.toThrow();
  });

  it('does not throw when deleting a file that does not exist', async () => {
    await expect(provider.delete('avatars/user-1/missing.jpg')).resolves.toBeUndefined();
  });
});
