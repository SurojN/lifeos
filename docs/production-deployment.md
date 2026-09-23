# Production deployment and credentials

LifeOS cannot use placeholder or local-development credentials in production. Provider credentials are created only after the owner signs in to each provider; they cannot be safely invented, committed, or sent through chat.

## Recommended production services

- Vercel for the Next.js application and encrypted environment variables.
- Clerk, installed through Vercel Marketplace, for authentication.
- Neon Postgres, installed through Vercel Marketplace, for structured records.
- A private AWS S3 bucket with Block Public Access and SSE-KMS for medical and identity documents.

The database and authentication integrations can automatically inject most variables. The S3 bucket remains separate because LifeOS requires private storage, checksum verification, server-generated keys, and KMS encryption.

## One-time owner setup

Install and authenticate the Vercel CLI, link this repository, and provision managed services:

```bash
npm install --global vercel
vercel login
vercel link
vercel integration add clerk
vercel integration add neon
vercel env pull .env.local --yes
```

Use the account that owns the deployed LifeOS project. A local CLI installation or a connected Vercel account does not establish access to that project; verify the project and environment before pulling configuration or deploying.

Create a private S3 bucket in a suitable region, enable Block Public Access, create a customer-managed KMS key, require TLS and SSE-KMS in the bucket policy, configure CORS only for the production LifeOS origin and `PUT`, and create a least-privilege server identity restricted to the LifeOS document prefix. Add its values from `.env.production.example` through Vercel Project → Settings → Environment Variables. Never place them in a tracked file.

Generate the application encryption key without printing or pasting it into source control:

```bash
printf 'v1:'; openssl rand -base64 32
```

Add the result as `APPLICATION_ENCRYPTION_KEY` in Vercel for Production. Keep a protected backup; losing it makes encrypted personal fields unreadable. Rotation requires keeping the old value in `APPLICATION_ENCRYPTION_PREVIOUS_KEYS` until data has been re-encrypted.

After the first deployment, create a Clerk webhook for `https://YOUR_DOMAIN/api/webhooks/clerk`, subscribe to user created/updated/deleted events, and add its signing secret as `CLERK_WEBHOOK_SECRET`.

## Deployment checks

```bash
npm run lint
npm run typecheck
npm test
npm run build:release
vercel deploy --prod
```

Apply Prisma migrations to the production database as a controlled release step before directing traffic to schema-dependent code:

1. Create a protected backup and verify restoration on an isolated database.
2. Review pending SQL, then run `npm run db:deploy` with the intended environment supplied securely.
3. Run `npm run db:status`, then `npm run build:release`. Configure Vercel's **Build Command** as `npm run build:release` so pending or failed migrations block a schema-dependent release.
4. Check sign-in and `/dashboard` in the deployed environment. An anonymous request should redirect to sign-in; it is not evidence of a signed-in dashboard failure.

`build:release` checks migration state; it does not change the database. Plain `npm run build` remains available for compilation without database access. Never use `prisma db push` or reset a production database.

`prisma.config.ts` prefers an explicitly supplied `DATABASE_URL_UNPOOLED` or `DATABASE_URL` before reading `.env.local` and `.env`. When neither is supplied by the process, it loads local configuration and prefers the unpooled URL. Runtime traffic uses pooled `DATABASE_URL`. If overriding a local test target, set **both** variables to that target to avoid accidentally retaining a production direct connection.

### Dashboard schema mismatch

Prisma `P2022` for `LifeEvent.medicalRecordId` means the running client expects a migration that the database lacks. The required migrations are `20260910110000_ai_extraction_foundation` and `20260915093000_link_medical_records_to_life_events`, after the initial foundation. Apply the repository migration history in order using the steps above; do not add an ad hoc column or replace existing records. The migration regression tests verify preservation of existing fields, explicit-denial consent defaults, optional medical links, and owner constraints.

## Optional integrations

Bank, wallet, hospital, insurer, government, calendar, maps, road-condition, lodging, and safety providers are not required for the core application. Add one only after confirming API availability, user consent, data retention, deletion, audit, and failure behavior. Never ask users to provide bank passwords or scrape private portals.
