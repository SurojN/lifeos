import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireInternalUser, requirePageUser } from "@/lib/auth/adapter";
import { AuthenticationError, InternalUserMappingError } from "@/lib/security/errors";

const mocks = vi.hoisted(() => ({ auth: Object.assign(vi.fn(), { protect: vi.fn() }), currentUser: vi.fn(), upsert: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth, currentUser: mocks.currentUser }));
vi.mock("@/lib/db/client", () => ({ getDatabase: () => ({ user: { upsert: mocks.upsert } }) }));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ userId: "verified-clerk-user" });
  mocks.currentUser.mockResolvedValue({ primaryEmailAddress: { emailAddress: "synthetic@example.test" }, fullName: "Synthetic user" });
  mocks.upsert.mockResolvedValue({ id: "internal-owner", clerkUserId: "verified-clerk-user", status: "ACTIVE" });
});

describe("page authentication", () => {
  it("preserves the sign-in redirect before any account or database lookup", async () => {
    const redirect = new Error("NEXT_REDIRECT");
    mocks.auth.protect.mockRejectedValue(redirect);
    await expect(requirePageUser()).rejects.toBe(redirect);
    expect(mocks.auth).not.toHaveBeenCalled();
    expect(mocks.currentUser).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("maps a protected session to its active internal owner", async () => {
    await expect(requirePageUser()).resolves.toMatchObject({ id: "internal-owner" });
    expect(mocks.auth.protect).toHaveBeenCalledOnce();
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { clerkUserId: "verified-clerk-user" } }));
  });

  it("continues to reject inactive internal accounts", async () => {
    mocks.upsert.mockResolvedValue({ id: "internal-owner", clerkUserId: "verified-clerk-user", status: "SUSPENDED" });
    await expect(requirePageUser()).rejects.toBeInstanceOf(InternalUserMappingError);
  });

  it("retains API authentication errors without converting them into page redirects", async () => {
    mocks.auth.mockResolvedValue({ userId: null });
    await expect(requireInternalUser()).rejects.toBeInstanceOf(AuthenticationError);
    expect(mocks.auth.protect).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});
