# Threat model

Protected assets include identity mappings, medical records, life events, consent history, audit records, database credentials, encryption keys, and source documents.

Primary threats are cross-user object access, forged Clerk webhooks, client-supplied user IDs or object keys, malicious uploads, leaked credentials, sensitive logs, public bucket configuration, broken deletion, and treating unverified extraction as fact.

Current controls include verified Clerk sessions, signed Svix webhook verification, idempotent user synchronization, internal-user mapping, ownership-scoped queries, strict Zod input schemas, MIME/size/checksum validation, user-prefixed generated keys, private S3 API calls, safe client errors, security headers, and server-side audit creation.

Residual risks: malware scanning and quarantine execution are not implemented; storage infrastructure policy is not provisioned or tested; database RLS is absent; application-level encryption and key rotation are undecided; rate limits, backup restoration, retention enforcement, incident response, and audit immutability need design; Clerk and cloud providers remain external processors. No real medical data should be used until these controls are approved and deployed.
