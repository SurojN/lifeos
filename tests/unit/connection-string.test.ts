import { describe, expect, it } from "vitest";
import { withStrictPostgresTls } from "@/lib/db/connection-string";

describe("Postgres TLS normalization", () => {
  it.each(["prefer", "require", "verify-ca"])("upgrades %s to verify-full", (mode) => {
    const result = new URL(withStrictPostgresTls(`postgresql://user:pass@example.com/db?sslmode=${mode}&channel_binding=require`));
    expect(result.searchParams.get("sslmode")).toBe("verify-full");
    expect(result.searchParams.get("channel_binding")).toBe("require");
  });

  it("preserves explicit verify-full", () => {
    expect(new URL(withStrictPostgresTls("postgresql://user:pass@example.com/db?sslmode=verify-full")).searchParams.get("sslmode")).toBe("verify-full");
  });
});
