import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadPrismaDatabaseUrl } from "@/lib/env/prisma";

describe("Prisma environment loading", () => {
  let directory: string;

  beforeEach(() => { directory = mkdtempSync(join(tmpdir(), "lifeos-prisma-env-")); });
  afterEach(() => { rmSync(directory, { recursive: true, force: true }); });

  it("loads the documented .env.local before .env", () => {
    writeFileSync(join(directory, ".env.local"), "DATABASE_URL=postgresql://local.example/lifeos\n");
    writeFileSync(join(directory, ".env"), "DATABASE_URL=postgresql://base.example/lifeos\n");

    expect(loadPrismaDatabaseUrl(directory, {})).toBe("postgresql://local.example/lifeos");
  });

  it("falls back to .env when .env.local is absent", () => {
    writeFileSync(join(directory, ".env"), "DATABASE_URL=postgresql://base.example/lifeos\n");

    expect(loadPrismaDatabaseUrl(directory, {})).toBe("postgresql://base.example/lifeos");
  });

  it("preserves externally supplied environment values", () => {
    writeFileSync(join(directory, ".env.local"), "DATABASE_URL=postgresql://local.example/lifeos\nDATABASE_URL_UNPOOLED=postgresql://local-direct.example/lifeos\n");
    writeFileSync(join(directory, ".env"), "DATABASE_URL=postgresql://base.example/lifeos\nDATABASE_URL_UNPOOLED=postgresql://base-direct.example/lifeos\n");
    const environment = {
      DATABASE_URL: "postgresql://deployment.example/lifeos",
      DATABASE_URL_UNPOOLED: "postgresql://deployment-direct.example/lifeos",
    };

    expect(loadPrismaDatabaseUrl(directory, environment)).toBe("postgresql://deployment-direct.example/lifeos");
    expect(environment.DATABASE_URL).toBe("postgresql://deployment.example/lifeos");
  });

  it("prefers the direct migration URL and retains strict TLS", () => {
    writeFileSync(join(directory, ".env.local"), "DATABASE_URL=postgresql://pool.example/lifeos\nDATABASE_URL_UNPOOLED=postgresql://direct.example/lifeos?sslmode=require\n");

    expect(loadPrismaDatabaseUrl(directory, {})).toBe("postgresql://direct.example/lifeos?sslmode=verify-full");
  });

  it("uses an externally supplied pooled URL when no direct URL is configured", () => {
    writeFileSync(join(directory, ".env.local"), "DATABASE_URL=postgresql://local.example/lifeos\n");

    expect(loadPrismaDatabaseUrl(directory, { DATABASE_URL: "postgresql://deployment.example/lifeos" })).toBe("postgresql://deployment.example/lifeos");
  });

  it("allows schema-only generation without database configuration or env files", () => {
    expect(loadPrismaDatabaseUrl(directory, {})).toBeUndefined();
  });

  it("does not redirect an explicit test database to a direct URL from a local file", () => {
    writeFileSync(join(directory, ".env.local"), "DATABASE_URL_UNPOOLED=postgresql://production.example/lifeos\n");
    expect(loadPrismaDatabaseUrl(directory, { DATABASE_URL: "postgresql://127.0.0.1/lifeos_test" }))
      .toBe("postgresql://127.0.0.1/lifeos_test");
  });
});
