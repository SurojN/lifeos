import { defineConfig } from "prisma/config";
import { loadPrismaDatabaseUrl } from "./src/lib/env/prisma";

const databaseUrl = loadPrismaDatabaseUrl();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Client generation is schema-only and must also work during a clean install.
  // Commands that access Postgres still receive the real URL from the environment.
  datasource: databaseUrl ? { url: databaseUrl } : undefined,
});
