import { ZodError } from "zod";

export class AuthenticationError extends Error {
  readonly status = 401;
  constructor() { super("Authentication required."); this.name = "AuthenticationError"; }
}

export class AuthorizationError extends Error {
  readonly status = 404;
  constructor() { super("Resource not found."); this.name = "AuthorizationError"; }
}

export class InternalUserMappingError extends Error {
  readonly status = 403;
  constructor() { super("Account setup is incomplete."); this.name = "InternalUserMappingError"; }
}

export class AuditFailureError extends Error {
  readonly status = 503;
  constructor() { super("The operation could not be recorded safely."); this.name = "AuditFailureError"; }
}

export function safeErrorResponse(error: unknown): Response {
  if (error instanceof ZodError) return Response.json({ error: "Invalid request." }, { status: 400 });
  if (error instanceof AuthenticationError || error instanceof InternalUserMappingError || error instanceof AuthorizationError || error instanceof AuditFailureError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  return Response.json({ error: "The request could not be completed." }, { status: 500 });
}
