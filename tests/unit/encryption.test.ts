import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { EncryptionError, VersionedEncryption } from "@/lib/security/encryption";

const key = `v1:${randomBytes(32).toString("base64")}`;

describe("versioned AES-256-GCM encryption", () => {
  it("encrypts and decrypts authenticated plaintext", () => {
    const encryption = new VersionedEncryption(key);
    const encrypted = encryption.encrypt("private medical value");
    expect(encrypted.startsWith("v1.")).toBe(true);
    expect(encrypted).not.toContain("private medical value");
    expect(encryption.decrypt(encrypted)).toBe("private medical value");
  });

  it("uses a unique random nonce for every encryption", () => {
    const encryption = new VersionedEncryption(key);
    expect(encryption.encrypt("same value")).not.toBe(encryption.encrypt("same value"));
  });

  it("fails closed when ciphertext or its authentication tag is modified", () => {
    const encryption = new VersionedEncryption(key);
    const encrypted = encryption.encrypt("private");
    const parts = encrypted.split(".");
    const tag = Buffer.from(parts[3]!, "base64url");
    tag[0] = tag[0]! ^ 1;
    parts[3] = tag.toString("base64url");
    const tampered = parts.join(".");
    expect(() => encryption.decrypt(tampered)).toThrow(EncryptionError);
  });

  it("rejects malformed ciphertext and supports previous key versions", () => {
    const oldKey = `v1:${randomBytes(32).toString("base64")}`;
    const newKey = `v2:${randomBytes(32).toString("base64")}`;
    const oldCiphertext = new VersionedEncryption(oldKey).encrypt("rotate me");
    expect(new VersionedEncryption(newKey, [oldKey]).decrypt(oldCiphertext)).toBe("rotate me");
    expect(() => new VersionedEncryption(newKey).decrypt("malformed")).toThrow(EncryptionError);
  });
});
