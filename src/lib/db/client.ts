import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getServerEnvironment } from "@/lib/env/server";

let database: PrismaClient | undefined;

export function getDatabase(): PrismaClient {
  if (!database) {
    const adapter = new PrismaPg({ connectionString: getServerEnvironment().DATABASE_URL });
    database = new PrismaClient({ adapter });
  }
  return database;
}
