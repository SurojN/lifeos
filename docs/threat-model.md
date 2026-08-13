# Threat model

Protected assets include identity mappings, medical records, life events, consent history, audit records, database credentials, encryption keys, and source documents.

Primary threats are cross-user object access, forged Clerk webhooks, client-supplied user IDs or object keys, malicious uploads, leaked credentials, sensitive logs, public bucket configuration, broken deletion, and treating unverified extraction as fact.

Current controls include verified Clerk sessions, signed Svix webhook verification, a persistent replay ledger, internal-user mapping, ownership-scoped queries, compound tenant foreign keys, authenticated application encryption, strict Zod input schemas, signed PUT MIME/size/checksum constraints, user-prefixed generated keys, private S3 API calls, quarantine, safe client errors, security headers, and server-side success/denial audits.

Residual risks: malware scanning and quarantine release are not implemented; storage infrastructure policy is not provisioned or tested; database RLS is absent; automated key re-encryption and rotation orchestration are not implemented; rate limits, backup restoration, retention enforcement, incident response, audit immutability and alerting need design; Clerk and cloud providers remain external processors. No real medical data should be used until these controls are approved and deployed.

Future OCR or AI must operate only after quarantine release and explicit consent. Its output is always `UNVERIFIED`, source-linked, confidence-labelled, and user-reviewable. It must not diagnose, prescribe, invent missing facts, produce financial recommendations, or silently promote information to verified status.
