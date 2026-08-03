import { describe, expect, it } from "vitest";
import { requireActiveInternalUser, requireIdentity } from "@/lib/auth/policy";
import { AuthenticationError, InternalUserMappingError } from "@/lib/security/errors";

describe("authentication policy", () => {
  it("rejects unauthenticated access", () => { expect(() => requireIdentity(null)).toThrow(AuthenticationError); });
  it("fails safely when the internal mapping is missing", () => { expect(() => requireActiveInternalUser(null)).toThrow(InternalUserMappingError); });
  it("rejects inactive internal users", () => { expect(() => requireActiveInternalUser({ id: "user-a", clerkUserId: "clerk-a", status: "DELETED" })).toThrow(InternalUserMappingError); });
});
