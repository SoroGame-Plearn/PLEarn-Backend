import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { StorageProvider, UploadFileInput, UploadFileResult } from '../interfaces/storage-provider.interface';

export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor(config: ConfigService) {
    this.bucket = config.get<string>('storage.s3.bucket') ?? '';
    const region = config.get<string>('storage.s3.region') ?? 'us-east-1';
    const accessKeyId = config.get<string>('storage.s3.accessKeyId');
    const secretAccessKey = config.get<string>('storage.s3.secretAccessKey');
    const endpoint = config.get<string>('storage.s3.endpoint');

    this.client = new S3Client({
      region,
      endpoint: endpoint || undefined,
      forcePathStyle: config.get<boolean>('storage.s3.forcePathStyle') ?? false,
      credentials:
        accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
    });

    const configuredBaseUrl = config.get<string>('storage.s3.publicBaseUrl');
    this.publicBaseUrl = configuredBaseUrl
      ? configuredBaseUrl.replace(/\/+$/, '')
      : endpoint
        ? `${endpoint.replace(/\/+$/, '')}/${this.bucket}`
        : `https://${this.bucket}.s3.${region}.amazonaws.com`;
  }

  async upload({ key, body, contentType }: UploadFileInput): Promise<UploadFileResult> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return { key, url: `${this.publicBaseUrl}/${key}` };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
