import "dotenv/config";
import { defineConfig } from "prisma/config";
import { withStrictPostgresTls } from "./src/lib/db/connection-string";

const databaseUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Client generation is schema-only and must also work during a clean install.
  // Commands that access Postgres still receive the real URL from the environment.
  datasource: databaseUrl ? { url: withStrictPostgresTls(databaseUrl) } : undefined,
});
