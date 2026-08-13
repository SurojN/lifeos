export interface UploadInput {
  userId: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
  requestedStorageKey?: never;
}

export interface UploadAuthorization { storageKey: string; uploadUrl: string; expiresAt: Date; requiredHeaders: Record<string, string> }
export interface UploadConfirmation { storageKey: string; sizeBytes: number; checksum: string }
export interface PrivateObject { body: unknown; mimeType: string; sizeBytes: number }

export interface PrivateStorage {
  createUploadAuthorization(input: UploadInput): Promise<UploadAuthorization>;
  confirmUpload(input: { userId: string; storageKey: string; expectedSizeBytes: number; expectedChecksum: string }): Promise<UploadConfirmation>;
  getPrivateObject(input: { userId: string; storageKey: string }): Promise<PrivateObject>;
  deletePrivateObject(input: { userId: string; storageKey: string }): Promise<void>;
}
