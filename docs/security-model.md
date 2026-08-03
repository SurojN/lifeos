# Security model

## Trust boundaries

- The browser is untrusted for identity, user IDs, storage keys, verification state, and authorization decisions.
- Clerk is trusted only to authenticate an external identity and maintain its session.
- LifeOS maps that identity to an active internal user and authorizes every personal-data operation with the internal ID.
- PostgreSQL stores ownership and metadata; the private object store holds original document bytes.
- Server code and deployment secrets form a privileged boundary. Secrets never use `NEXT_PUBLIC_` except Clerk's publishable key.

Authentication does not imply resource authorization. Queries for user-owned data include both the resource ID and authenticated internal user ID. Missing mappings fail closed. UI visibility never substitutes for server authorization.

Audit records are created server-side, append-only at the application layer, and exclude raw documents and unnecessary medical values. Responses suppress stack traces and return the same not-found result for missing and foreign resources.

Storage uses private buckets, server-generated prefixes, MIME and size validation, SHA-256 checksums, and short upload authorization lifetimes. Production S3 requires an AWS KMS key; infrastructure must additionally block all public access and enforce least-privilege IAM.
