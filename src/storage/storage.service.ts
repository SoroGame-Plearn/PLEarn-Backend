import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider, UploadFileInput, UploadFileResult } from './interfaces/storage-provider.interface';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { S3StorageProvider } from './providers/s3-storage.provider';

@Injectable()
export class StorageService implements StorageProvider {
  private readonly provider: StorageProvider;

  constructor(config: ConfigService) {
    const driver = config.get<string>('storage.driver');
    this.provider = driver === 's3' ? new S3StorageProvider(config) : new LocalStorageProvider(config);
  }

  upload(input: UploadFileInput): Promise<UploadFileResult> {
    return this.provider.upload(input);
  }

  delete(key: string): Promise<void> {
    return this.provider.delete(key);
  }
}
