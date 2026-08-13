import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { getEncryptionEnvironment } from "@/lib/env/server";

const ALGORITHM = "aes-256-gcm";
const NONCE_BYTES = 12;
const TAG_BYTES = 16;
const ENCODING_SEPARATOR = ".";

export class EncryptionError extends Error {
  constructor() { super("Encrypted value is invalid or cannot be decrypted."); this.name = "EncryptionError"; }
}

function parseKey(encoded: string): { version: string; key: Buffer } {
  const separator = encoded.indexOf(":");
  if (separator < 1) throw new EncryptionError();
  const version = encoded.slice(0, separator);
  const key = Buffer.from(encoded.slice(separator + 1), "base64");
  if (!/^v[1-9]\d*$/.test(version) || key.length !== 32) throw new EncryptionError();
  return { version, key };
}

export class VersionedEncryption {
  private readonly activeVersion: string;
  private readonly keys: ReadonlyMap<string, Buffer>;

  constructor(activeKey: string, previousKeys: readonly string[] = []) {
    const active = parseKey(activeKey);
    const parsed = [active, ...previousKeys.filter(Boolean).map(parseKey)];
    if (new Set(parsed.map(item => item.version)).size !== parsed.length) throw new EncryptionError();
    this.activeVersion = active.version;
    this.keys = new Map(parsed.map(item => [item.version, item.key]));
  }

  encrypt(plaintext: string): string {
    const key = this.keys.get(this.activeVersion);
    if (!key) throw new EncryptionError();
    const nonce = randomBytes(NONCE_BYTES);
    const cipher = createCipheriv(ALGORITHM, key, nonce, { authTagLength: TAG_BYTES });
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    return [this.activeVersion, nonce.toString("base64url"), ciphertext.toString("base64url"), cipher.getAuthTag().toString("base64url")].join(ENCODING_SEPARATOR);
  }

  decrypt(encoded: string): string {
    try {
      const [version, nonceEncoded, ciphertextEncoded, tagEncoded, extra] = encoded.split(ENCODING_SEPARATOR);
      if (!version || !nonceEncoded || ciphertextEncoded === undefined || !tagEncoded || extra !== undefined) throw new EncryptionError();
      const key = this.keys.get(version);
      const nonce = Buffer.from(nonceEncoded, "base64url");
      const ciphertext = Buffer.from(ciphertextEncoded, "base64url");
      const tag = Buffer.from(tagEncoded, "base64url");
      if (!key || nonce.length !== NONCE_BYTES || tag.length !== TAG_BYTES) throw new EncryptionError();
      const decipher = createDecipheriv(ALGORITHM, key, nonce, { authTagLength: TAG_BYTES });
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
    } catch (error) {
      if (error instanceof EncryptionError) throw error;
      throw new EncryptionError();
    }
  }

  encryptJson(value: unknown): string { return this.encrypt(JSON.stringify(value)); }
  decryptJson<T>(encoded: string): T {
    try { return JSON.parse(this.decrypt(encoded)) as T; } catch (error) { if (error instanceof EncryptionError) throw error; throw new EncryptionError(); }
  }
}

let applicationEncryption: VersionedEncryption | undefined;

export function getApplicationEncryption(): VersionedEncryption {
  if (!applicationEncryption) {
    const environment = getEncryptionEnvironment();
    applicationEncryption = new VersionedEncryption(environment.APPLICATION_ENCRYPTION_KEY, environment.APPLICATION_ENCRYPTION_PREVIOUS_KEYS?.split(",").map(key => key.trim()));
  }
  return applicationEncryption;
}
