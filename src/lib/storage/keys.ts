import { randomUUID } from "node:crypto";
import { resourceIdSchema } from "@/validation/common";

function safeExtension(fileName: string): string {
  const extension = fileName.toLowerCase().match(/\.(pdf|png|jpe?g)$/)?.[1];
  return extension ? `.${extension === "jpeg" ? "jpg" : extension}` : "";
}

export function generateStorageKey(userId: string, originalFileName: string, id: () => string = randomUUID): string {
  resourceIdSchema.parse(userId);
  return `users/${userId}/documents/${id()}${safeExtension(originalFileName)}`;
}

export function assertUserScopedStorageKey(userId: string, storageKey: string): void {
  if (!storageKey.startsWith(`users/${userId}/documents/`) || storageKey.includes("..")) throw new Error("Storage object not found.");
}
