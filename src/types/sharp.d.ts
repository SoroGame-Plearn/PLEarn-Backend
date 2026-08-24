// sharp@0.35's shipped package.json only declares "types" as an ESM (.d.mts)
// declaration file. Under this project's classic ("node") module resolution
// (no esModuleInterop — see AvatarService for why), TypeScript resolves that
// to a non-callable namespace type instead of the real callable CJS export.
// This shim declares just the subset of the sharp API this project uses, so
// `import sharp = require('sharp')` type-checks against what actually runs
// at runtime (`require('sharp')`, unaffected by this file).
declare module 'sharp' {
  interface SharpMetadata {
    format?: string;
    width?: number;
    height?: number;
  }

  interface JpegOptions {
    quality?: number;
    mozjpeg?: boolean;
  }

  interface ResizeOptions {
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  }

  interface CreateOptions {
    create: {
      width: number;
      height: number;
      channels: 3 | 4;
      background: { r: number; g: number; b: number; alpha?: number };
    };
  }

  interface Sharp {
    metadata(): Promise<SharpMetadata>;
    rotate(): Sharp;
    resize(width: number, height: number, options?: ResizeOptions): Sharp;
    jpeg(options?: JpegOptions): Sharp;
    png(): Sharp;
    toBuffer(): Promise<Buffer>;
  }

  interface SharpConstructor {
    (input?: Buffer | CreateOptions): Sharp;
  }

  const sharp: SharpConstructor;
  export = sharp;
}
