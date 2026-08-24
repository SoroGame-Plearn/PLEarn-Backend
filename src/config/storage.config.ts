import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  // 'local' writes to disk and serves files from this process — the default so the
  // app works out of the box in development/tests without any cloud credentials.
  // 'S3' uploads to an AWS S3 (or S3-compatible) bucket for production use.
  driver: (process.env.STORAGE_DRIVER ?? 'local').toLowerCase(),

  local: {
    uploadDir: process.env.STORAGE_LOCAL_DIR ?? 'uploads',
    publicBaseUrl: process.env.STORAGE_PUBLIC_BASE_URL ?? 'http://localhost:3000',
  },

  s3: {
    bucket: process.env.AWS_S3_BUCKET ?? '',
    region: process.env.AWS_REGION ?? 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    // Optional: point at an S3-compatible endpoint (MinIO, DigitalOcean Spaces, etc.)
    endpoint: process.env.AWS_S3_ENDPOINT,
    forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === 'true',
    // Optional: serve through a CDN/custom domain instead of the raw S3 URL.
    publicBaseUrl: process.env.AWS_S3_PUBLIC_BASE_URL,
  },
}));
