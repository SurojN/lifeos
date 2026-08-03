import { AuthenticationError, InternalUserMappingError } from "@/lib/security/errors";
import type { ExternalIdentity, InternalUserIdentity } from "@/types/auth";

export function requireIdentity(identity: ExternalIdentity | null): ExternalIdentity {
  if (!identity) throw new AuthenticationError();
  return identity;
}

export function requireActiveInternalUser(user: InternalUserIdentity | null): InternalUserIdentity {
  if (!user || user.status !== "ACTIVE") throw new InternalUserMappingError();
  return user;
}
