import "server-only";
import { getDatabase } from "@/lib/db/client";

export function findUserByClerkId(clerkUserId: string) {
  return getDatabase().user.findUnique({ where: { clerkUserId }, select: { id: true, clerkUserId: true, email: true, displayName: true, status: true, deletedAt: true } });
}
