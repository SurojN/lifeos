import { config } from "dotenv";
import { resolve } from "node:path";
import { withStrictPostgresTls } from "../db/connection-string";

export function loadPrismaDatabaseUrl(directory = process.cwd(), environment: Partial<NodeJS.ProcessEnv> = process.env): string | undefined {
  const suppliedDatabaseUrl = environment.DATABASE_URL_UNPOOLED || environment.DATABASE_URL;
  // Match the documented local setup without replacing deployment or shell values.
  config({
    path: [resolve(directory, ".env.local"), resolve(directory, ".env")],
    processEnv: environment,
    override: false,
    quiet: true,
  });
  const databaseUrl = suppliedDatabaseUrl || environment.DATABASE_URL_UNPOOLED || environment.DATABASE_URL;
  return databaseUrl ? withStrictPostgresTls(databaseUrl) : undefined;
}
