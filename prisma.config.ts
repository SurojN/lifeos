import "dotenv/config";
import { defineConfig, env } from "prisma/config";
import { withStrictPostgresTls } from "./src/lib/db/connection-string";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: withStrictPostgresTls(process.env.DATABASE_URL_UNPOOLED || env("DATABASE_URL")) },
});
