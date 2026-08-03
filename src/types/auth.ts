export interface ExternalIdentity {
  externalUserId: string;
  email?: string;
  displayName?: string;
}

export interface InternalUserIdentity {
  id: string;
  clerkUserId: string;
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
}
