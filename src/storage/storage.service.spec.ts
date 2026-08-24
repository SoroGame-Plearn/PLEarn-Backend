import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { S3StorageProvider } from './providers/s3-storage.provider';

describe('StorageService', () => {
  it('defaults to the local provider when no driver is configured', () => {
    const service = new StorageService(new ConfigService({ storage: {} }));
    expect((service as any).provider).toBeInstanceOf(LocalStorageProvider);
  });

  it('uses the local provider when STORAGE_DRIVER is "local"', () => {
    const service = new StorageService(new ConfigService({ storage: { driver: 'local' } }));
    expect((service as any).provider).toBeInstanceOf(LocalStorageProvider);
  });

  it('uses the S3 provider when STORAGE_DRIVER is "s3"', () => {
    const service = new StorageService(
      new ConfigService({ storage: { driver: 's3', s3: { bucket: 'my-bucket', region: 'us-east-1' } } }),
    );
    expect((service as any).provider).toBeInstanceOf(S3StorageProvider);
  });
});
