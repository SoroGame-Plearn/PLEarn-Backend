export interface UploadFileInput {
  /** Storage key / relative path the file will be stored under, e.g. "avatars/<userId>/<uuid>.jpg" */
  key: string;
  body: Buffer;
  contentType: string;
}

export interface UploadFileResult {
  key: string;
  url: string;
}

export interface StorageProvider {
  upload(input: UploadFileInput): Promise<UploadFileResult>;
  delete(key: string): Promise<void>;
}
