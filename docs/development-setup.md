# Development setup

Requirements: Node.js 22+, PostgreSQL, a Clerk application, and MinIO with a private bucket. Copy `.env.example` to `.env.local`, replace every placeholder, and never commit the result.

```bash
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

Configure Clerk's webhook endpoint as `/api/webhooks/clerk` and subscribe to user created, updated, and deleted events. The endpoint rejects unsigned payloads and synchronizes only identity fields into the internal user record.

MinIO must use a private bucket with no anonymous policy. Production S3 additionally requires Block Public Access, SSE-KMS, bucket-policy TLS enforcement, and least-privilege credentials. This repository does not provision infrastructure.

Quality checks:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Known local limitation: protected pages require valid Clerk, PostgreSQL, and internal user mapping configuration. No source-document upload endpoint or presigned download is provided in this phase.
