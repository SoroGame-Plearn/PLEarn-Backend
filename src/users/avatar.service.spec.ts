// eslint-disable-next-line @typescript-eslint/no-require-imports -- see src/types/sharp.d.ts
import sharp = require('sharp');
import { BadRequestException } from '@nestjs/common';
import { AvatarService } from './avatar.service';

async function makeImage(
  width: number,
  height: number,
  format: 'jpeg' | 'png' = 'jpeg',
): Promise<Buffer> {
  const image = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 200, g: 50, b: 50 },
    },
  });
  return format === 'png' ? image.png().toBuffer() : image.jpeg().toBuffer();
}

describe('AvatarService', () => {
  let service: AvatarService;

  beforeEach(() => {
    service = new AvatarService();
  });

  it('accepts a valid JPEG and returns an optimized square JPEG', async () => {
    const buffer = await makeImage(800, 600, 'jpeg');

    const result = await service.process(buffer, 'image/jpeg');

    expect(result.contentType).toBe('image/jpeg');
    expect(result.extension).toBe('jpg');

    const metadata = await sharp(result.buffer).metadata();
    expect(metadata.format).toBe('jpeg');
    expect(metadata.width).toBe(512);
    expect(metadata.height).toBe(512);
  });

  it('accepts a valid PNG and converts it to JPEG', async () => {
    const buffer = await makeImage(300, 300, 'png');

    const result = await service.process(buffer, 'image/png');

    expect(result.contentType).toBe('image/jpeg');
    const metadata = await sharp(result.buffer).metadata();
    expect(metadata.format).toBe('jpeg');
  });

  it('rejects unsupported mime types before touching the file', async () => {
    const buffer = await makeImage(300, 300);

    await expect(service.process(buffer, 'image/gif')).rejects.toThrow(BadRequestException);
  });

  it('rejects a file whose bytes are not a real image', async () => {
    const buffer = Buffer.from('this is definitely not an image');

    await expect(service.process(buffer, 'image/jpeg')).rejects.toThrow(BadRequestException);
  });

  it('rejects images smaller than the minimum dimension', async () => {
    const buffer = await makeImage(10, 10);

    await expect(service.process(buffer, 'image/jpeg')).rejects.toThrow(BadRequestException);
  });

  it('rejects images larger than the maximum dimension', async () => {
    const buffer = await makeImage(5000, 5000);

    await expect(service.process(buffer, 'image/jpeg')).rejects.toThrow(BadRequestException);
  });
});
