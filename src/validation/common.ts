import { z } from "zod";

export const resourceIdSchema = z.string().cuid2();
export const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/i, "Checksum must be a SHA-256 hex digest.");
