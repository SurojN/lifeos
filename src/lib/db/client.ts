import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getDatabaseEnvironment } from "@/lib/env/server";
import { withStrictPostgresTls } from "@/lib/db/connection-string";

let database: PrismaClient | undefined;

export function getDatabase(): PrismaClient {
  if (!database) {
    const adapter = new PrismaPg({ connectionString: withStrictPostgresTls(getDatabaseEnvironment().DATABASE_URL) });
    database = new PrismaClient({ adapter });
  }
  return database;
}
