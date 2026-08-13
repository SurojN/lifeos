const EXPLICIT_VERIFY_MODES = new Set(["prefer", "require", "verify-ca"]);

export function withStrictPostgresTls(connectionString: string): string {
  const url = new URL(connectionString);
  const sslMode = url.searchParams.get("sslmode");
  if (sslMode && EXPLICIT_VERIFY_MODES.has(sslMode)) url.searchParams.set("sslmode", "verify-full");
  return url.toString();
}
