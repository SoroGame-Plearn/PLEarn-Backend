import { mkdir, rm, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { ConfigService } from '@nestjs/config';
import { StorageProvider, UploadFileInput, UploadFileResult } from '../interfaces/storage-provider.interface';

/**
 * Writes uploaded files to disk under STORAGE_LOCAL_DIR. Intended for local
 * development and tests — main.ts serves this directory as static assets at
 * `/uploads` so the returned URL is retrievable without any extra setup.
 */
export class LocalStorageProvider implements StorageProvider {
  private readonly uploadDir: string;
  private readonly publicBaseUrl: string;

  constructor(config: ConfigService) {
    this.uploadDir = config.get<string>('storage.local.uploadDir') ?? 'uploads';
    this.publicBaseUrl = (config.get<string>('storage.local.publicBaseUrl') ?? '').replace(/\/+$/, '');
  }

  async upload({ key, body }: UploadFileInput): Promise<UploadFileResult> {
    const filePath = join(process.cwd(), this.uploadDir, key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, body);
    return { key, url: `${this.publicBaseUrl}/uploads/${key}` };
  }

  async delete(key: string): Promise<void> {
    const filePath = join(process.cwd(), this.uploadDir, key);
    await rm(filePath, { force: true });
  }
}
