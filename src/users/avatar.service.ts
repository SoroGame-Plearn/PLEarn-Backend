import { BadRequestException, Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports -- see src/types/sharp.d.ts
import sharp = require('sharp');

export interface ProcessedAvatar {
  buffer: Buffer;
  contentType: string;
  extension: string;
}

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png']);
const ALLOWED_FORMATS = new Set(['jpeg', 'png']);
const MIN_DIMENSION = 32;
const MAX_DIMENSION = 4000;
const TARGET_DIMENSION = 512;
const JPEG_QUALITY = 80;

/**
 * Validates and optimizes uploaded avatar images. Every accepted image is
 * normalized to a square JPEG so downstream consumers always get a
 * predictable, storage-friendly file regardless of what was uploaded.
 */
@Injectable()
export class AvatarService {
  static readonly maxUploadSizeBytes = 5 * 1024 * 1024; // 5MB
  static readonly allowedMimeTypes = ALLOWED_MIME_TYPES;

  async process(buffer: Buffer, mimetype: string): Promise<ProcessedAvatar> {
    if (!ALLOWED_MIME_TYPES.has(mimetype)) {
      throw new BadRequestException('Only JPEG and PNG images are supported');
    }

    const image = sharp(buffer);
    const metadata = await image.metadata().catch(() => {
      throw new BadRequestException('Uploaded file is not a valid image');
    });

    if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format)) {
      throw new BadRequestException('Only JPEG and PNG images are supported');
    }

    if (!metadata.width || !metadata.height) {
      throw new BadRequestException('Unable to read image dimensions');
    }

    if (metadata.width < MIN_DIMENSION || metadata.height < MIN_DIMENSION) {
      throw new BadRequestException(
        `Image must be at least ${MIN_DIMENSION}x${MIN_DIMENSION}px`,
      );
    }

    if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) {
      throw new BadRequestException(
        `Image must not exceed ${MAX_DIMENSION}x${MAX_DIMENSION}px`,
      );
    }

    const optimized = await sharp(buffer)
      .rotate() // normalize EXIF orientation before resizing
      .resize(TARGET_DIMENSION, TARGET_DIMENSION, { fit: 'cover' })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer();

    return { buffer: optimized, contentType: 'image/jpeg', extension: 'jpg' };
  }
}
