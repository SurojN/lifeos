import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getDatabase } from "@/lib/db/client";
import { requireActiveInternalUser, requireIdentity } from "./policy";
import type { ExternalIdentity, InternalUserIdentity } from "@/types/auth";

export async function getExternalIdentity(): Promise<ExternalIdentity | null> {
  const session = await auth();
  if (!session.userId) return null;
  const user = await currentUser();
  return {
    externalUserId: session.userId,
    email: user?.primaryEmailAddress?.emailAddress,
    displayName: user?.fullName ?? undefined,
  };
}

export async function requireAuthenticatedIdentity(): Promise<ExternalIdentity> {
  return requireIdentity(await getExternalIdentity());
}

export async function getOrCreateInternalUser(identity: ExternalIdentity): Promise<InternalUserIdentity> {
  const user = await getDatabase().user.upsert({
    where: { clerkUserId: identity.externalUserId },
    update: {},
    create: { clerkUserId: identity.externalUserId, email: identity.email ?? "unknown", displayName: identity.displayName ?? "LifeOS user" },
    select: { id: true, clerkUserId: true, status: true },
  });
  return user;
}

export async function requireInternalUser(): Promise<InternalUserIdentity> {
  const identity = await requireAuthenticatedIdentity();
  // A verified Clerk session is sufficient to bootstrap the internal ownership
  // record. Webhooks keep identity fields synchronized later, but sign-in must
  // not depend on webhook delivery ordering or configuration.
  const user = await getOrCreateInternalUser(identity);
  return requireActiveInternalUser(user);
}
